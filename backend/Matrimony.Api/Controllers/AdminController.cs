using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<AdminStatsDto> Stats()
    {
        var now = DateTime.UtcNow;
        var revenue = new RevenueDto(
            await db.PaymentOrders.CountAsync(o => o.Status == OrderStatus.Paid && o.Amount > 0),
            await db.PaymentOrders.Where(o => o.Status == OrderStatus.Paid).SumAsync(o => (long)o.Amount),
            await db.Subscriptions.CountAsync(s => s.PlanCode == "Gold" && s.StartsAt <= now && s.EndsAt > now),
            await db.Subscriptions.CountAsync(s => s.PlanCode == "Platinum" && s.StartsAt <= now && s.EndsAt > now));
        return await StatsCore(revenue);
    }

    private async Task<AdminStatsDto> StatsCore(RevenueDto revenue) => new(
        await db.Users.CountAsync(u => u.Role == UserRole.User),
        await db.Users.CountAsync(u => u.Role == UserRole.User && u.IsActive),
        await db.Profiles.CountAsync(p => p.User.Role == UserRole.User && p.Gender == Gender.Male),
        await db.Profiles.CountAsync(p => p.User.Role == UserRole.User && p.Gender == Gender.Female),
        await db.Profiles.CountAsync(p => p.IsVerified),
        await db.Interests.CountAsync(),
        await db.Interests.CountAsync(i => i.Status == InterestStatus.Accepted),
        await db.Messages.CountAsync(),
        await db.Reports.CountAsync(r => r.Status == ReportStatus.Open),
        await db.VerificationRequests.CountAsync(v => v.Status == RequestStatus.Pending),
        await db.SuccessStories.CountAsync(s => s.Status == RequestStatus.Pending),
        revenue);

    [HttpGet("reports")]
    public async Task<List<AdminReportDto>> Reports(string status = "Open")
    {
        var query = db.Reports.AsNoTracking();
        if (Enum.TryParse<ReportStatus>(status, true, out var s)) query = query.Where(r => r.Status == s);
        return await query.OrderByDescending(r => r.CreatedAt).Take(200)
            .Select(r => new AdminReportDto(r.Id, r.ReporterId, r.Reporter.Profile!.FullName, r.ReportedId, r.Reported.Profile!.FullName,
                r.Reported.IsActive, r.Reason, r.Details, r.Status.ToString(), r.AdminNote, r.CreatedAt,
                db.Reports.Count(x => x.ReportedId == r.ReportedId)))
            .ToListAsync();
    }

    /// <summary>Close a report. Optionally block the reported member at the same time.</summary>
    [HttpPost("reports/{id:int}/resolve")]
    public async Task<IActionResult> ResolveReport(int id, ResolveReportRequest req)
    {
        var report = await db.Reports.Include(r => r.Reported).FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();
        report.Status = req.BlockUser ? ReportStatus.ActionTaken : ReportStatus.Dismissed;
        report.AdminNote = req.Note;
        report.ResolvedAt = DateTime.UtcNow;
        if (req.BlockUser) report.Reported.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("users")]
    public async Task<PagedResult<AdminUserDto>> Users(string? q, int page = 1, int pageSize = 20)
    {
        var query = db.Users.AsNoTracking().Where(u => u.Role == UserRole.User);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(u => u.Email.Contains(q) || u.Profile!.FullName.Contains(q));

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new AdminUserDto(u.Id, u.Email, u.Profile!.FullName, u.Role.ToString(), u.IsActive,
                u.Profile.IsVerified, u.CreatedAt, u.LastLoginAt))
            .ToListAsync();
        return new PagedResult<AdminUserDto>(items, total, page, pageSize);
    }

    [HttpPost("users/{id:int}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.User);
        if (user is null) return NotFound();
        user.IsActive = !user.IsActive;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("users/{id:int}/toggle-verified")]
    public async Task<IActionResult> ToggleVerified(int id)
    {
        var profile = await db.Profiles.FirstOrDefaultAsync(p => p.UserId == id);
        if (profile is null) return NotFound();
        profile.IsVerified = !profile.IsVerified;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
