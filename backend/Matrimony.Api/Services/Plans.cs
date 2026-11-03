using Matrimony.Api.Data;
using Matrimony.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Services;

/// <summary>What a plan includes. Prices are examples – change them here.</summary>
public record Plan(
    string Code,
    string Name,
    int PriceInr,          // whole rupees
    int Months,
    int? InterestsPerDay,  // null = unlimited
    int ContactViews,      // contact details you can unlock without an accepted interest
    bool SeeVisitors,      // see who viewed your profile
    bool Boost,            // shown first in search and matches
    bool Badge,            // "Premium" badge on your profile
    string[] Highlights);

public static class PlanCatalog
{
    public const string Free = "Free";

    public static readonly Plan[] All =
    [
        new(Free, "Free", 0, 0, 10, 0, false, false, false,
            ["Create your profile", "Search and see matches", "10 interests a day", "Chat after an interest is accepted"]),
        new("Gold", "Gold", 2999, 3, 50, 50, true, false, true,
            ["Everything in Free", "50 interests a day", "View 50 contact details", "See who viewed your profile", "Premium badge"]),
        new("Platinum", "Platinum", 5999, 6, null, 150, true, true, true,
            ["Everything in Gold", "Unlimited interests", "View 150 contact details", "Profile boost: shown first in search", "6 months"]),
    ];

    public static Plan? Find(string code) => All.FirstOrDefault(p => p.Code.Equals(code, StringComparison.OrdinalIgnoreCase));
    public static Plan FreePlan => All[0];
}

public record PlanStatus(Plan Plan, Subscription? Subscription)
{
    public bool IsPaid => Subscription != null;
    public int ContactViewsLeft => Subscription is null ? 0 : Math.Max(0, Subscription.ContactViewsTotal - Subscription.ContactViewsUsed);
}

public class PlanService(AppDbContext db)
{
    public async Task<PlanStatus> StatusAsync(int userId)
    {
        var now = DateTime.UtcNow;
        var sub = await db.Subscriptions.Where(s => s.UserId == userId && s.StartsAt <= now && s.EndsAt > now)
            .OrderByDescending(s => s.EndsAt).FirstOrDefaultAsync();
        var plan = sub is null ? PlanCatalog.FreePlan : PlanCatalog.Find(sub.PlanCode) ?? PlanCatalog.FreePlan;
        return new PlanStatus(plan, sub);
    }

    /// <summary>
    /// Turns a paid order into a subscription. Buying the same plan again extends it;
    /// switching plans starts the new one now. Unused contact views carry over either way.
    /// </summary>
    public async Task<Subscription> ActivateAsync(PaymentOrder order)
    {
        var plan = PlanCatalog.Find(order.PlanCode) ?? throw new InvalidOperationException("Unknown plan");
        var now = DateTime.UtcNow;
        var current = await db.Subscriptions.Where(s => s.UserId == order.UserId && s.StartsAt <= now && s.EndsAt > now)
            .OrderByDescending(s => s.EndsAt).FirstOrDefaultAsync();

        var carriedViews = current is null ? 0 : Math.Max(0, current.ContactViewsTotal - current.ContactViewsUsed);
        var startsAt = now;
        var endsAt = now.AddMonths(plan.Months);
        if (current is not null)
        {
            if (current.PlanCode == plan.Code) endsAt = current.EndsAt.AddMonths(plan.Months);
            current.EndsAt = now; // replaced by the new subscription below
        }

        var sub = new Subscription
        {
            UserId = order.UserId,
            PlanCode = plan.Code,
            StartsAt = startsAt,
            EndsAt = endsAt,
            ContactViewsTotal = plan.ContactViews + carriedViews,
            PaymentOrderId = order.Id,
        };
        db.Subscriptions.Add(sub);

        var profile = await db.Profiles.FirstAsync(p => p.UserId == order.UserId);
        profile.PremiumPlan = plan.Code;
        profile.PremiumUntil = endsAt;
        await db.SaveChangesAsync();
        return sub;
    }
}
