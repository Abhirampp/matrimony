using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(AppDbContext db, Notifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<List<NotificationDto>> List()
    {
        var me = User.UserId();
        var rows = await db.Notifications.AsNoTracking().Where(n => n.UserId == me)
            .OrderByDescending(n => n.CreatedAt).Take(50).ToListAsync();
        return rows.Select(Notifier.ToDto).ToList();
    }

    /// <summary>Unread notification and message counts for the navigation badges.</summary>
    [HttpGet("badges")]
    public Task<BadgesDto> Badges() => Notifier.BadgesAsync(db, User.UserId());

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> Read(int id)
    {
        var me = User.UserId();
        await db.Notifications.Where(n => n.Id == id && n.UserId == me).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        await notifier.PushBadgesAsync(me);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll()
    {
        var me = User.UserId();
        await db.Notifications.Where(n => n.UserId == me && !n.IsRead).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        await notifier.PushBadgesAsync(me);
        return NoContent();
    }
}
