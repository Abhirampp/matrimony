using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Matrimony.Api.Data;
using Matrimony.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Services;

/// <summary>
/// Payment provider. Razorpay is used when Payments:Razorpay:KeyId and KeySecret are set
/// (use rzp_test_… keys while testing). Otherwise, only in Development and only when
/// Payments:Provider is "Demo", a pretend checkout is allowed so the flow can be tried
/// locally. No money moves in Demo mode.
/// </summary>
public class PaymentGateway(IConfiguration config, IWebHostEnvironment env, IHttpClientFactory http)
{
    public string? KeyId => config["Payments:Razorpay:KeyId"];
    private string? KeySecret => config["Payments:Razorpay:KeySecret"];

    public string Mode =>
        !string.IsNullOrWhiteSpace(KeyId) && !string.IsNullOrWhiteSpace(KeySecret) ? "Razorpay"
        : env.IsDevelopment() && config["Payments:Provider"] == "Demo" ? "Demo"
        : "None";

    /// <summary>Creates a Razorpay order and returns its id (order_…).</summary>
    public async Task<string> CreateRazorpayOrderAsync(int amount, string currency, string receipt, int userId, string planCode)
    {
        var client = http.CreateClient();
        var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{KeyId}:{KeySecret}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);
        var res = await client.PostAsJsonAsync("https://api.razorpay.com/v1/orders", new
        {
            amount,
            currency,
            receipt,
            notes = new { userId = userId.ToString(), plan = planCode },
        });
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode) throw new InvalidOperationException($"Razorpay order failed ({(int)res.StatusCode}): {body}");
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetString()!;
    }

    /// <summary>Checks the signature Razorpay Checkout returns: HMAC-SHA256(order_id|payment_id, key secret).</summary>
    public bool VerifyCheckoutSignature(string orderId, string paymentId, string signature) =>
        !string.IsNullOrEmpty(KeySecret) && SignatureMatches($"{orderId}|{paymentId}", KeySecret, signature);

    /// <summary>Checks the X-Razorpay-Signature header on webhooks: HMAC-SHA256(raw body, webhook secret).</summary>
    public bool VerifyWebhookSignature(string rawBody, string signature)
    {
        var secret = config["Payments:Razorpay:WebhookSecret"];
        return !string.IsNullOrEmpty(secret) && SignatureMatches(rawBody, secret, signature);
    }

    private static bool SignatureMatches(string payload, string secret, string signature)
    {
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload));
        var given = Encoding.UTF8.GetBytes(signature ?? "");
        var expectedHex = Encoding.UTF8.GetBytes(Convert.ToHexStringLower(expected));
        return CryptographicOperations.FixedTimeEquals(expectedHex, given);
    }
}

/// <summary>Marks orders as paid (exactly once), activates the plan and sends the receipt.</summary>
public class OrderService(AppDbContext db, PlanService plans, Notifier notifier, MessageSender sender, IConfiguration config)
{
    public async Task<bool> MarkPaidAsync(PaymentOrder order, string? providerPaymentId)
    {
        // Atomic claim: the browser callback and the webhook may arrive together; only one wins.
        var now = DateTime.UtcNow;
        var claimed = await db.PaymentOrders
            .Where(o => o.Id == order.Id && o.Status != OrderStatus.Paid)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, OrderStatus.Paid)
                .SetProperty(o => o.PaidAt, now)
                .SetProperty(o => o.ProviderPaymentId, providerPaymentId));
        if (claimed == 0) return false;

        order.Status = OrderStatus.Paid;
        order.PaidAt = now;
        order.ProviderPaymentId = providerPaymentId;
        order.InvoiceNumber = $"{config["Billing:InvoicePrefix"] ?? "VIV"}-{order.PaidAt:yyyy}-{order.Id:D5}";
        await db.SaveChangesAsync();

        var sub = await plans.ActivateAsync(order);
        var plan = PlanCatalog.Find(order.PlanCode)!;
        await notifier.NotifyAsync(order.UserId, NotificationType.PlanActivated,
            $"Your {plan.Name} plan is active until {sub.EndsAt:d MMM yyyy}. Enjoy!", "/plans");

        var email = db.Users.Where(u => u.Id == order.UserId).Select(u => u.Email).First();
        await sender.SendEmailAsync(email, $"Payment received – {plan.Name} plan",
            $"Thank you! We received ₹{order.Amount / 100:N0} for the {plan.Name} plan.\n" +
            $"Invoice: {order.InvoiceNumber}\nValid until: {sub.EndsAt:d MMM yyyy}\n\n" +
            $"View your invoice: {config["App:FrontendUrl"]}/billing");
        return true;
    }
}
