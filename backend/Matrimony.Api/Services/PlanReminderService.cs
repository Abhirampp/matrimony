using Matrimony.Api.Data;
using Matrimony.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Services;

/// <summary>
/// Runs every hour: reminds members 3 days before their plan ends, and tells them when it has ended.
/// </summary>
public class PlanReminderService(IServiceScopeFactory scopes, ILogger<PlanReminderService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        // Small delay so startup (migrations, seeding) finishes first
        await Task.Delay(TimeSpan.FromSeconds(10), stop);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            try { await RunOnceAsync(); }
            catch (Exception ex) { log.LogError(ex, "Plan reminder run failed"); }
        } while (await timer.WaitForNextTickAsync(stop));
    }

    public async Task RunOnceAsync()
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifier = scope.ServiceProvider.GetRequiredService<Notifier>();
        var sender = scope.ServiceProvider.GetRequiredService<MessageSender>();
        var now = DateTime.UtcNow;

        // A subscription that was replaced by a newer one doesn't need reminders
        bool HasNewer(Subscription s) => db.Subscriptions.Any(x => x.UserId == s.UserId && x.Id != s.Id && x.EndsAt > s.EndsAt);

        var ending = await db.Subscriptions
            .Where(s => !s.ReminderSent && s.EndsAt > now && s.EndsAt <= now.AddDays(3) && s.StartsAt < s.EndsAt)
            .ToListAsync();
        foreach (var s in ending)
        {
            s.ReminderSent = true;
            if (HasNewer(s)) continue;
            var plan = PlanCatalog.Find(s.PlanCode)?.Name ?? s.PlanCode;
            await notifier.NotifyAsync(s.UserId, NotificationType.PlanExpiring,
                $"Your {plan} plan ends on {s.EndsAt:d MMM}. Renew to keep your benefits.", "/plans");
            var email = await db.Users.Where(u => u.Id == s.UserId).Select(u => u.Email).FirstAsync();
            await sender.SendEmailAsync(email, $"Your {plan} plan ends soon",
                $"Your {plan} plan ends on {s.EndsAt:d MMM yyyy}. Renew any time from the Plans page to keep your benefits.");
        }

        var ended = await db.Subscriptions.Where(s => !s.ExpiryNotified && s.EndsAt <= now).ToListAsync();
        foreach (var s in ended)
        {
            s.ExpiryNotified = true;
            if (HasNewer(s)) continue; // upgraded or renewed – not really "expired"
            var plan = PlanCatalog.Find(s.PlanCode)?.Name ?? s.PlanCode;
            var profile = await db.Profiles.FirstAsync(p => p.UserId == s.UserId);
            if (profile.PremiumUntil <= now) { profile.PremiumPlan = null; profile.PremiumUntil = null; }
            await notifier.NotifyAsync(s.UserId, NotificationType.PlanExpired,
                $"Your {plan} plan has ended. You're back on the Free plan.", "/plans");
        }
        await db.SaveChangesAsync();
    }
}
