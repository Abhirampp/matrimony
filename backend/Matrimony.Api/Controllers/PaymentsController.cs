using System.Text.Json;
using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

[ApiController]
[Route("api")]
public class PaymentsController(
    AppDbContext db, PlanService plans, PaymentGateway gateway, OrderService orders, IConfiguration config,
    ILogger<PaymentsController> log) : ControllerBase
{
    // ---------------- Plans ----------------

    [AllowAnonymous]
    [HttpGet("plans")]
    public object Plans() => new { paymentMode = gateway.Mode, plans = PlanCatalog.All.Select(ToDto) };

    [Authorize]
    [HttpGet("plans/me")]
    public async Task<MyPlanDto> MyPlan()
    {
        var me = User.UserId();
        var status = await plans.StatusAsync(me);
        var since = DateTime.UtcNow.AddHours(-24);
        var today = await db.Interests.CountAsync(i => i.SenderId == me && i.CreatedAt >= since);
        return new MyPlanDto(ToDto(status.Plan), status.IsPaid, status.Subscription?.StartsAt, status.Subscription?.EndsAt,
            status.ContactViewsLeft, status.Subscription?.ContactViewsTotal ?? 0, today, status.Plan.InterestsPerDay);
    }

    // ---------------- Checkout ----------------

    [Authorize]
    [HttpPost("payments/orders")]
    public async Task<ActionResult<CheckoutDto>> CreateOrder(CreateOrderRequest req)
    {
        var plan = PlanCatalog.Find(req.PlanCode);
        if (plan is null || plan.PriceInr <= 0) return BadRequest(new { message = "Choose a paid plan." });
        if (gateway.Mode == "None")
            return StatusCode(503, new { message = "Payments aren't set up yet. Add Razorpay keys in the API settings." });

        var me = User.UserId();
        var user = await db.Users.Include(u => u.Profile).FirstAsync(u => u.Id == me);
        var order = new PaymentOrder { UserId = me, PlanCode = plan.Code, Amount = plan.PriceInr * 100, Provider = gateway.Mode };
        db.PaymentOrders.Add(order);
        await db.SaveChangesAsync();

        if (gateway.Mode == "Razorpay")
        {
            try
            {
                order.ProviderOrderId = await gateway.CreateRazorpayOrderAsync(order.Amount, order.Currency, $"order_{order.Id}", me, plan.Code);
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Could not create Razorpay order");
                order.Status = OrderStatus.Failed;
                await db.SaveChangesAsync();
                return StatusCode(502, new { message = "The payment service didn't respond. Please try again." });
            }
        }

        return new CheckoutDto(order.Id, order.Provider, order.Amount, order.Currency, plan.Name, order.ProviderOrderId,
            gateway.Mode == "Razorpay" ? gateway.KeyId : null, user.Profile?.FullName ?? "", user.Email, user.Phone);
    }

    /// <summary>Called by the browser after checkout succeeds.</summary>
    [Authorize]
    [HttpPost("payments/verify")]
    public async Task<ActionResult<MyPlanDto>> Verify(VerifyPaymentRequest req)
    {
        var me = User.UserId();
        var order = await db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == req.OrderId && o.UserId == me);
        if (order is null) return NotFound();
        if (order.Status == OrderStatus.Paid) return await MyPlan();

        if (order.Provider == "Razorpay")
        {
            if (req.RazorpayOrderId != order.ProviderOrderId || string.IsNullOrEmpty(req.RazorpayPaymentId) ||
                !gateway.VerifyCheckoutSignature(order.ProviderOrderId!, req.RazorpayPaymentId, req.RazorpaySignature ?? ""))
            {
                log.LogWarning("Payment signature check failed for order {OrderId}", order.Id);
                return BadRequest(new { message = "We couldn't confirm this payment. If money was taken, contact support with your order number." });
            }
            await orders.MarkPaidAsync(order, req.RazorpayPaymentId);
        }
        else if (order.Provider == "Demo")
        {
            // Only possible in Development with Payments:Provider = Demo
            if (gateway.Mode != "Demo" || !req.Demo) return BadRequest(new { message = "Demo payments are turned off." });
            await orders.MarkPaidAsync(order, $"demo_{Guid.NewGuid():N}"[..20]);
        }
        else
        {
            return BadRequest();
        }
        return await MyPlan();
    }

    [Authorize]
    [HttpPost("payments/orders/{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var me = User.UserId();
        await db.PaymentOrders.Where(o => o.Id == id && o.UserId == me && o.Status == OrderStatus.Created)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Failed));
        return NoContent();
    }

    /// <summary>
    /// Razorpay webhook (set it up in the Razorpay dashboard for "order.paid"). Activates the plan even if
    /// the member closed the browser before the checkout callback ran.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("payments/razorpay-webhook")]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Razorpay-Signature"].ToString();
        if (!gateway.VerifyWebhookSignature(body, signature)) return Unauthorized();

        using var doc = JsonDocument.Parse(body);
        if (doc.RootElement.GetProperty("event").GetString() != "order.paid") return Ok();
        var payload = doc.RootElement.GetProperty("payload");
        var orderId = payload.GetProperty("order").GetProperty("entity").GetProperty("id").GetString();
        var paymentId = payload.GetProperty("payment").GetProperty("entity").GetProperty("id").GetString();

        var order = await db.PaymentOrders.FirstOrDefaultAsync(o => o.ProviderOrderId == orderId);
        if (order != null) await orders.MarkPaidAsync(order, paymentId);
        return Ok();
    }

    // ---------------- Billing history ----------------

    [Authorize]
    [HttpGet("payments/orders")]
    public async Task<List<OrderDto>> MyOrders()
    {
        var me = User.UserId();
        var rows = await db.PaymentOrders.AsNoTracking().Where(o => o.UserId == me && o.Status == OrderStatus.Paid)
            .OrderByDescending(o => o.CreatedAt).ToListAsync();
        return rows.Select(ToDto).ToList();
    }

    [Authorize]
    [HttpGet("payments/orders/{id:int}/invoice")]
    public async Task<ActionResult<InvoiceDto>> Invoice(int id)
    {
        var me = User.UserId();
        var isAdmin = User.IsInRole("Admin");
        var order = await db.PaymentOrders.AsNoTracking().Include(o => o.User).ThenInclude(u => u.Profile)
            .FirstOrDefaultAsync(o => o.Id == id && (o.UserId == me || isAdmin) && o.Status == OrderStatus.Paid);
        if (order is null) return NotFound();
        var sub = await db.Subscriptions.AsNoTracking().FirstOrDefaultAsync(s => s.PaymentOrderId == order.Id);
        return new InvoiceDto(ToDto(order), order.User.Profile?.FullName ?? order.User.Email, order.User.Email, order.User.Phone,
            sub?.StartsAt, sub?.EndsAt,
            config["Billing:SellerName"] ?? "Vivaha Matrimony", config["Billing:SellerAddress"] ?? "");
    }

    // ---------------- Admin ----------------

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/payments")]
    public async Task<List<AdminOrderDto>> AdminOrders(string status = "Paid")
    {
        var q = db.PaymentOrders.AsNoTracking();
        if (Enum.TryParse<OrderStatus>(status, true, out var s)) q = q.Where(o => o.Status == s);
        return await q.OrderByDescending(o => o.CreatedAt).Take(200)
            .Select(o => new AdminOrderDto(o.Id, o.UserId, o.User.Profile!.FullName, o.User.Email, o.PlanCode, o.Amount,
                o.Status.ToString(), o.Provider, o.InvoiceNumber, o.CreatedAt, o.PaidAt))
            .ToListAsync();
    }

    /// <summary>Give a member a plan for free (support, goodwill, testing). Recorded as a ₹0 order.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("admin/users/{userId:int}/grant-plan")]
    public async Task<IActionResult> Grant(int userId, GrantPlanRequest req)
    {
        var plan = PlanCatalog.Find(req.PlanCode);
        if (plan is null || plan.PriceInr <= 0) return BadRequest(new { message = "Choose a paid plan." });
        if (!await db.Users.AnyAsync(u => u.Id == userId && u.Role == UserRole.User)) return NotFound();

        var order = new PaymentOrder { UserId = userId, PlanCode = plan.Code, Amount = 0, Provider = "Admin" };
        db.PaymentOrders.Add(order);
        await db.SaveChangesAsync();
        await orders.MarkPaidAsync(order, $"grant:{req.Reason}".Length > 64 ? "grant" : $"grant:{req.Reason}");
        return NoContent();
    }

    private static PlanDto ToDto(Plan p) =>
        new(p.Code, p.Name, p.PriceInr, p.Months, p.InterestsPerDay, p.ContactViews, p.SeeVisitors, p.Boost, p.Badge, p.Highlights);

    private static OrderDto ToDto(PaymentOrder o) =>
        new(o.Id, o.PlanCode, PlanCatalog.Find(o.PlanCode)?.Name ?? o.PlanCode, o.Amount, o.Currency, o.Status.ToString(),
            o.Provider, o.ProviderPaymentId, o.InvoiceNumber, o.CreatedAt, o.PaidAt);
}
