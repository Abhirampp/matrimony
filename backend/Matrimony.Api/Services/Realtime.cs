using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Services;

/// <summary>
/// Real-time channel to signed-in members. The server pushes:
///   "message"      – a new chat message (MessageDto)
///   "notification" – a new notification (NotificationDto)
///   "badges"       – fresh unread counts (BadgesDto)
///   "read"         – { by } the other person has read your messages
/// Members are addressed by user id (taken from the JWT's NameIdentifier claim).
/// </summary>
[Authorize]
public class AppHub : Hub
{
}

public class Notifier(AppDbContext db, IHubContext<AppHub> hub)
{
    /// <summary>Saves a notification and pushes it (plus new badge counts) to the member.</summary>
    public async Task NotifyAsync(int userId, NotificationType type, string text, string? link, int? actorId = null)
    {
        var n = new Notification { UserId = userId, Type = type, Text = text, Link = link, ActorId = actorId };
        db.Notifications.Add(n);
        await db.SaveChangesAsync();
        await hub.Clients.User(userId.ToString()).SendAsync("notification", ToDto(n));
        await PushBadgesAsync(userId);
    }

    public async Task PushMessageAsync(MessageDto m)
    {
        await hub.Clients.Users(m.ReceiverId.ToString(), m.SenderId.ToString()).SendAsync("message", m);
        await PushBadgesAsync(m.ReceiverId);
    }

    /// <summary>Tells a sender that the reader has seen their messages (for ✓✓ ticks).</summary>
    public Task PushReadAsync(int senderId, int readerId) =>
        hub.Clients.User(senderId.ToString()).SendAsync("read", new { by = readerId });

    public async Task PushBadgesAsync(int userId) =>
        await hub.Clients.User(userId.ToString()).SendAsync("badges", await BadgesAsync(db, userId));

    public static async Task<BadgesDto> BadgesAsync(AppDbContext db, int userId)
    {
        // Messages from blocked members don't count
        var blocked = await db.Blocks.Where(b => b.BlockerId == userId || b.BlockedId == userId)
            .Select(b => b.BlockerId == userId ? b.BlockedId : b.BlockerId).ToListAsync();
        return new BadgesDto(
            await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead),
            await db.Messages.CountAsync(m => m.ReceiverId == userId && !m.IsRead && !blocked.Contains(m.SenderId)));
    }

    public static NotificationDto ToDto(Notification n) =>
        new(n.Id, n.Type.ToString(), n.Text, n.Link, n.ActorId, n.IsRead, n.CreatedAt);

    /// <summary>First name of a member, for notification text.</summary>
    public async Task<string> NameOf(int userId) =>
        await db.Profiles.Where(p => p.UserId == userId).Select(p => p.FullName).FirstOrDefaultAsync() ?? "A member";
}
