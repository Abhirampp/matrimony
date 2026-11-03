using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/interests")]
public class InterestsController(AppDbContext db, Notifier notifier, PlanService plans) : ControllerBase
{
    [HttpPost("{userId:int}")]
    public async Task<IActionResult> Send(int userId)
    {
        var me = User.UserId();
        if (userId == me) return BadRequest(new { message = "You cannot send interest to yourself." });
        if (await db.IsBlockedAsync(me, userId)) return BadRequest(new { message = "You can't send an interest to this member." });

        var target = await db.Profiles.Include(p => p.User).FirstOrDefaultAsync(p => p.UserId == userId && p.User.IsActive);
        if (target is null) return NotFound();
        var mine = await db.Profiles.FirstAsync(p => p.UserId == me);
        if (mine.Gender == target.Gender) return BadRequest(new { message = "Interest can only be sent to the opposite gender." });

        if (await db.Interests.AnyAsync(i =>
                (i.SenderId == me && i.ReceiverId == userId) || (i.SenderId == userId && i.ReceiverId == me)))
            return Conflict(new { message = "An interest already exists between you and this member." });

        // Daily limit depends on the plan
        var plan = (await plans.StatusAsync(me)).Plan;
        if (plan.InterestsPerDay is int limit)
        {
            var since = DateTime.UtcNow.AddHours(-24);
            if (await db.Interests.CountAsync(i => i.SenderId == me && i.CreatedAt >= since) >= limit)
                return StatusCode(429, new
                {
                    message = plan.Code == PlanCatalog.Free
                        ? $"Free members can send {limit} interests a day. Upgrade to send more."
                        : $"You've reached today's limit of {limit} interests. Try again tomorrow."
                });
        }

        db.Interests.Add(new Interest { SenderId = me, ReceiverId = userId });
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(userId, NotificationType.InterestReceived,
            $"{mine.FullName} sent you an interest", "/interests", me);
        return NoContent();
    }

    [HttpGet("received")]
    public Task<List<InterestDto>> Received() => List(received: true);

    [HttpGet("sent")]
    public Task<List<InterestDto>> Sent() => List(received: false);

    [HttpPost("{id:int}/respond")]
    public async Task<IActionResult> Respond(int id, RespondInterestRequest req)
    {
        var me = User.UserId();
        var interest = await db.Interests.FirstOrDefaultAsync(i => i.Id == id && i.ReceiverId == me);
        if (interest is null) return NotFound();
        if (interest.Status != InterestStatus.Pending) return BadRequest(new { message = "This interest has already been answered." });

        interest.Status = req.Accept ? InterestStatus.Accepted : InterestStatus.Declined;
        interest.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (req.Accept)
            await notifier.NotifyAsync(interest.SenderId, NotificationType.InterestAccepted,
                $"{await notifier.NameOf(me)} accepted your interest. You can now chat.", $"/messages/{me}", me);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var me = User.UserId();
        var interest = await db.Interests.FirstOrDefaultAsync(i => i.Id == id && i.SenderId == me && i.Status == InterestStatus.Pending);
        if (interest is null) return NotFound();
        db.Interests.Remove(interest);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<List<InterestDto>> List(bool received)
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var me = ctx.MyId;
        var interests = db.Interests.AsNoTracking();
        var rows = received
            ? await interests.Where(i => i.ReceiverId == me && i.Sender.IsActive)
                .Select(i => new { i.Id, i.Status, i.CreatedAt, Other = i.Sender.Profile })
                .OrderByDescending(x => x.CreatedAt).ToListAsync()
            : await interests.Where(i => i.SenderId == me && i.Receiver.IsActive)
                .Select(i => new { i.Id, i.Status, i.CreatedAt, Other = i.Receiver.Profile })
                .OrderByDescending(x => x.CreatedAt).ToListAsync();

        return rows.Where(r => r.Other != null && !ctx.BlockedEitherWay.Contains(r.Other.UserId))
            .Select(r => new InterestDto(r.Id, ctx.Card(r.Other!), r.Status.ToString(), r.CreatedAt, !received))
            .ToList();
    }
}

[ApiController]
[Authorize]
[Route("api/shortlist")]
public class ShortlistController(AppDbContext db, Notifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<List<ProfileCardDto>> Get()
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var profiles = await db.Shortlists.AsNoTracking()
            .Where(s => s.UserId == ctx.MyId && s.ShortlistedUser.IsActive)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => s.ShortlistedUser.Profile!)
            .ToListAsync();
        return profiles.Where(p => !ctx.BlockedEitherWay.Contains(p.UserId)).Select(ctx.Card).ToList();
    }

    [HttpPost("{userId:int}")]
    public async Task<IActionResult> Add(int userId)
    {
        var me = User.UserId();
        if (userId == me) return BadRequest();
        if (!await db.Users.AnyAsync(u => u.Id == userId)) return NotFound();
        if (!await db.Shortlists.AnyAsync(s => s.UserId == me && s.ShortlistedUserId == userId))
        {
            db.Shortlists.Add(new Shortlist { UserId = me, ShortlistedUserId = userId });
            await db.SaveChangesAsync();
            if (!await db.IsBlockedAsync(me, userId))
                await notifier.NotifyAsync(userId, NotificationType.Shortlisted,
                    $"{await notifier.NameOf(me)} shortlisted your profile", $"/profile/{me}", me);
        }
        return NoContent();
    }

    /// <summary>Members who shortlisted me.</summary>
    [HttpGet("by-others")]
    public async Task<List<ProfileCardDto>> ShortlistedMe()
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var me = ctx.MyId;
        var profiles = await db.Shortlists.AsNoTracking()
            .Where(s => s.ShortlistedUserId == me)
            .OrderByDescending(s => s.CreatedAt)
            .Join(db.Profiles.Where(p => p.User.IsActive), s => s.UserId, p => p.UserId, (s, p) => p)
            .Take(100).ToListAsync();
        return profiles.Where(p => !ctx.BlockedEitherWay.Contains(p.UserId)).Select(ctx.Card).ToList();
    }

    [HttpDelete("{userId:int}")]
    public async Task<IActionResult> Remove(int userId)
    {
        var me = User.UserId();
        await db.Shortlists.Where(s => s.UserId == me && s.ShortlistedUserId == userId).ExecuteDeleteAsync();
        return NoContent();
    }
}
