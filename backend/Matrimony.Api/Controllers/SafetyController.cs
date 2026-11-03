using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

/// <summary>Requests to see a member's protected photos.</summary>
[ApiController]
[Authorize]
[Route("api/photo-requests")]
public class PhotoRequestsController(AppDbContext db, Notifier notifier) : ControllerBase
{
    [HttpPost("{userId:int}")]
    public async Task<IActionResult> Ask(int userId)
    {
        var me = User.UserId();
        if (userId == me) return BadRequest();
        if (await db.IsBlockedAsync(me, userId)) return NotFound();
        var owner = await db.Profiles.FirstOrDefaultAsync(p => p.UserId == userId && p.User.IsActive);
        if (owner is null) return NotFound();
        if (owner.PhotoVisibility == PhotoVisibility.Everyone) return BadRequest(new { message = "These photos are already visible." });

        var existing = await db.PhotoRequests.FirstOrDefaultAsync(r => r.RequesterId == me && r.OwnerId == userId);
        if (existing is not null)
        {
            if (existing.Status != RequestStatus.Declined) return Conflict(new { message = "You have already requested these photos." });
            // Allow asking again after a decline
            existing.Status = RequestStatus.Pending;
            existing.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            db.PhotoRequests.Add(new PhotoRequest { RequesterId = me, OwnerId = userId });
        }
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(userId, NotificationType.PhotoRequested,
            $"{await notifier.NameOf(me)} asked to see your photos", "/interests?tab=photos", me);
        return NoContent();
    }

    [HttpGet("received")]
    public async Task<List<PhotoRequestDto>> Received()
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var rows = await db.PhotoRequests.AsNoTracking()
            .Where(r => r.OwnerId == ctx.MyId && r.Requester.IsActive)
            .OrderBy(r => r.Status).ThenByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.Status, r.CreatedAt, Profile = r.Requester.Profile })
            .ToListAsync();
        return rows.Where(r => r.Profile != null && !ctx.BlockedEitherWay.Contains(r.Profile.UserId))
            .Select(r => new PhotoRequestDto(r.Id, ctx.Card(r.Profile!), r.Status.ToString(), r.CreatedAt)).ToList();
    }

    [HttpPost("{id:int}/respond")]
    public async Task<IActionResult> Respond(int id, RespondPhotoRequest req)
    {
        var me = User.UserId();
        var r = await db.PhotoRequests.FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == me);
        if (r is null) return NotFound();
        var wasApproved = r.Status == RequestStatus.Approved;
        r.Status = req.Approve ? RequestStatus.Approved : RequestStatus.Declined;
        await db.SaveChangesAsync();
        if (req.Approve && !wasApproved)
            await notifier.NotifyAsync(r.RequesterId, NotificationType.PhotoRequestApproved,
                $"{await notifier.NameOf(me)} shared their photos with you", $"/profile/{me}", me);
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/blocks")]
public class BlocksController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<BlockedUserDto>> List()
    {
        var me = User.UserId();
        return await db.Blocks.AsNoTracking().Where(b => b.BlockerId == me)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new BlockedUserDto(b.BlockedId, b.Blocked.Profile!.FullName, b.CreatedAt))
            .ToListAsync();
    }

    [HttpPost("{userId:int}")]
    public async Task<IActionResult> Block(int userId)
    {
        var me = User.UserId();
        if (userId == me) return BadRequest();
        if (!await db.Users.AnyAsync(u => u.Id == userId)) return NotFound();
        if (!await db.Blocks.AnyAsync(b => b.BlockerId == me && b.BlockedId == userId))
        {
            db.Blocks.Add(new Block { BlockerId = me, BlockedId = userId });
            // Remove them from my shortlist
            await db.Shortlists.Where(s => s.UserId == me && s.ShortlistedUserId == userId).ExecuteDeleteAsync();
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{userId:int}")]
    public async Task<IActionResult> Unblock(int userId)
    {
        var me = User.UserId();
        await db.Blocks.Where(b => b.BlockerId == me && b.BlockedId == userId).ExecuteDeleteAsync();
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    public static readonly string[] Reasons =
        ["Fake profile", "Inappropriate photos", "Abusive or offensive messages", "Asking for money", "Already married", "Other"];

    [HttpPost("{userId:int}")]
    public async Task<IActionResult> Report(int userId, ReportRequest req)
    {
        var me = User.UserId();
        if (userId == me) return BadRequest();
        if (!Reasons.Contains(req.Reason)) return BadRequest(new { message = "Please pick a reason." });
        if (!await db.Users.AnyAsync(u => u.Id == userId && u.Role == UserRole.User)) return NotFound();
        if (await db.Reports.AnyAsync(r => r.ReporterId == me && r.ReportedId == userId && r.Status == ReportStatus.Open))
            return Conflict(new { message = "You have already reported this profile. Our team is reviewing it." });

        db.Reports.Add(new Report { ReporterId = me, ReportedId = userId, Reason = req.Reason, Details = req.Details?.Trim() });
        await db.SaveChangesAsync();
        return NoContent();
    }
}
