using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

/// <summary>Couples who met here share their story. Stories appear publicly only after an admin approves them.</summary>
[ApiController]
public class StoriesController(AppDbContext db, Notifier notifier, IWebHostEnvironment env) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("api/stories")]
    public async Task<List<StoryDto>> Published(int take = 30)
    {
        var rows = await db.SuccessStories.AsNoTracking().Where(s => s.Status == RequestStatus.Approved)
            .OrderByDescending(s => s.ReviewedAt).Take(Math.Clamp(take, 1, 100)).ToListAsync();
        return rows.Select(ToDto).ToList();
    }

    [Authorize]
    [HttpGet("api/stories/mine")]
    public async Task<List<StoryDto>> Mine()
    {
        var me = User.UserId();
        var rows = await db.SuccessStories.AsNoTracking().Where(s => s.SubmittedById == me).OrderByDescending(s => s.CreatedAt).ToListAsync();
        return rows.Select(ToDto).ToList();
    }

    [Authorize(Roles = "User")]
    [HttpPost("api/stories")]
    public async Task<ActionResult<StoryDto>> Submit(StoryRequest req)
    {
        var me = User.UserId();
        if (await db.SuccessStories.AnyAsync(s => s.SubmittedById == me && s.Status == RequestStatus.Pending))
            return Conflict(new { message = "Your story is already waiting for review." });
        if (req.WeddingDate > DateTime.UtcNow.AddYears(2)) return BadRequest(new { message = "Check the wedding date." });

        var s = new SuccessStory
        {
            SubmittedById = me, CoupleNames = req.CoupleNames.Trim(), Title = req.Title.Trim(), Story = req.Story.Trim(),
            WeddingDate = req.WeddingDate?.Date, City = req.City?.Trim(),
        };
        db.SuccessStories.Add(s);
        await db.SaveChangesAsync();
        return ToDto(s);
    }

    // ---------------- Admin ----------------

    [Authorize(Roles = "Admin")]
    [HttpGet("api/admin/stories")]
    public async Task<List<StoryDto>> ForReview(string status = "Pending")
    {
        var q = db.SuccessStories.AsNoTracking();
        if (Enum.TryParse<RequestStatus>(status, true, out var st)) q = q.Where(s => s.Status == st);
        var rows = await q.OrderBy(s => s.CreatedAt).Take(200).ToListAsync();
        return rows.Select(ToDto).ToList();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("api/admin/stories/{id:int}/review")]
    public async Task<IActionResult> Review(int id, ReviewStoryRequest req)
    {
        var s = await db.SuccessStories.FirstOrDefaultAsync(x => x.Id == id);
        if (s is null) return NotFound();
        s.Status = req.Approve ? RequestStatus.Approved : RequestStatus.Declined;
        s.ReviewedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (req.Approve)
            await notifier.NotifyAsync(s.SubmittedById, NotificationType.StoryApproved,
                "Your success story is now live. Thank you for sharing! 💐", "/success-stories");
        return NoContent();
    }

    // ---------------- Dev outbox (Development only) ----------------

    [Authorize(Roles = "Admin")]
    [HttpGet("api/admin/outbox")]
    public async Task<ActionResult<List<OutboxDto>>> Outbox()
    {
        if (!env.IsDevelopment()) return NotFound();
        return await db.OutboxMessages.AsNoTracking().OrderByDescending(m => m.CreatedAt).Take(50)
            .Select(m => new OutboxDto(m.Id, m.Channel, m.To, m.Subject, m.Body, m.CreatedAt)).ToListAsync();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("api/admin/outbox")]
    public async Task<IActionResult> ClearOutbox()
    {
        if (!env.IsDevelopment()) return NotFound();
        await db.OutboxMessages.ExecuteDeleteAsync();
        return NoContent();
    }

    private static StoryDto ToDto(SuccessStory s) =>
        new(s.Id, s.CoupleNames, s.Title, s.Story, s.WeddingDate, s.City, s.Status.ToString(), s.CreatedAt);
}

public record ReviewStoryRequest(bool Approve);
