using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

/// <summary>Chat is only allowed between two members whose interest was accepted and who haven't blocked each other.</summary>
[ApiController]
[Authorize]
[Route("api/messages")]
public class MessagesController(AppDbContext db, Notifier notifier) : ControllerBase
{
    [HttpGet("conversations")]
    public async Task<List<ConversationDto>> Conversations()
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var me = ctx.MyId;
        var partnerIds = ctx.Connected.Where(id => !ctx.BlockedEitherWay.Contains(id)).ToList();

        var profiles = await db.Profiles.AsNoTracking()
            .Where(p => partnerIds.Contains(p.UserId) && p.User.IsActive).ToListAsync();

        var result = new List<ConversationDto>();
        foreach (var p in profiles)
        {
            var last = await db.Messages.AsNoTracking()
                .Where(m => (m.SenderId == me && m.ReceiverId == p.UserId) || (m.SenderId == p.UserId && m.ReceiverId == me))
                .OrderByDescending(m => m.SentAt).FirstOrDefaultAsync();
            var unread = await db.Messages.CountAsync(m => m.SenderId == p.UserId && m.ReceiverId == me && !m.IsRead);
            result.Add(new ConversationDto(ctx.Card(p), last?.Content, last?.SentAt, unread));
        }
        return result.OrderByDescending(c => c.LastAt ?? DateTime.MinValue).ToList();
    }

    [HttpGet("{userId:int}")]
    public async Task<ActionResult<List<MessageDto>>> Thread(int userId)
    {
        var me = User.UserId();
        if (!await CanChat(me, userId)) return Forbid();

        // Mark incoming messages as read
        var marked = await db.Messages.Where(m => m.SenderId == userId && m.ReceiverId == me && !m.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true));
        if (marked > 0)
        {
            await notifier.PushBadgesAsync(me);
            await notifier.PushReadAsync(userId, me);
        }

        return await db.Messages.AsNoTracking()
            .Where(m => (m.SenderId == me && m.ReceiverId == userId) || (m.SenderId == userId && m.ReceiverId == me))
            .OrderBy(m => m.SentAt)
            .Select(m => new MessageDto(m.Id, m.SenderId, m.ReceiverId, m.Content, m.SentAt, m.IsRead))
            .ToListAsync();
    }

    [HttpPost("{userId:int}")]
    public async Task<ActionResult<MessageDto>> Send(int userId, SendMessageRequest req)
    {
        var me = User.UserId();
        if (string.IsNullOrWhiteSpace(req.Content)) return BadRequest(new { message = "Message cannot be empty." });
        if (!await CanChat(me, userId))
            return StatusCode(403, new { message = "You can message a member only after they accept your interest." });

        var msg = new Message { SenderId = me, ReceiverId = userId, Content = req.Content.Trim() };
        db.Messages.Add(msg);
        await db.SaveChangesAsync();
        var dto = new MessageDto(msg.Id, msg.SenderId, msg.ReceiverId, msg.Content, msg.SentAt, msg.IsRead);
        await notifier.PushMessageAsync(dto);
        return dto;
    }

    private async Task<bool> CanChat(int me, int other) =>
        !await db.IsBlockedAsync(me, other) &&
        await db.Interests.AnyAsync(i => i.Status == InterestStatus.Accepted &&
            ((i.SenderId == me && i.ReceiverId == other) || (i.SenderId == other && i.ReceiverId == me)));
}
