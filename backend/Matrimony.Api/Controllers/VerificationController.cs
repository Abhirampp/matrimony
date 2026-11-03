using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

/// <summary>
/// Members upload a government ID; an admin checks it and approves (verified badge) or rejects.
/// ID files are stored outside wwwroot so they are never publicly served, and are deleted once reviewed.
/// </summary>
[ApiController]
[Authorize]
[Route("api/verification")]
public class VerificationController(AppDbContext db, IWebHostEnvironment env, Notifier notifier) : ControllerBase
{
    public static readonly string[] DocumentTypes = ["Aadhaar", "PAN card", "Passport", "Driving licence", "Voter ID"];
    private static readonly Dictionary<string, string> AllowedTypes = new()
    {
        [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png", [".pdf"] = "application/pdf",
    };

    [HttpGet("me")]
    public async Task<VerificationStatusDto> Mine()
    {
        var me = User.UserId();
        var verified = await db.Profiles.Where(p => p.UserId == me).Select(p => p.IsVerified).FirstAsync();
        var last = await db.VerificationRequests.AsNoTracking().Where(v => v.UserId == me)
            .OrderByDescending(v => v.CreatedAt).FirstOrDefaultAsync();
        return new VerificationStatusDto(verified, last?.Status.ToString(), last?.DocumentType, last?.AdminNote, last?.CreatedAt);
    }

    [HttpPost]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<VerificationStatusDto>> Submit([FromForm] string documentType, IFormFile file)
    {
        var me = User.UserId();
        if (!DocumentTypes.Contains(documentType)) return BadRequest(new { message = "Choose a document type." });
        if (file is null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });
        if (file.Length > 5 * 1024 * 1024) return BadRequest(new { message = "The file must be 5 MB or smaller." });
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedTypes.TryGetValue(ext, out var contentType))
            return BadRequest(new { message = "Upload a JPG, PNG or PDF file." });

        if (await db.Profiles.AnyAsync(p => p.UserId == me && p.IsVerified))
            return BadRequest(new { message = "Your profile is already verified." });
        if (await db.VerificationRequests.AnyAsync(v => v.UserId == me && v.Status == RequestStatus.Pending))
            return Conflict(new { message = "Your document is already waiting for review." });

        var name = $"{me}_{Guid.NewGuid():N}{ext}";
        await using (var fs = System.IO.File.Create(Path.Combine(PrivateFolder(env), name)))
            await file.CopyToAsync(fs);

        db.VerificationRequests.Add(new VerificationRequest { UserId = me, DocumentType = documentType, FileName = name, ContentType = contentType });
        await db.SaveChangesAsync();
        return await Mine();
    }

    // ---------------- Admin ----------------

    [Authorize(Roles = "Admin")]
    [HttpGet("/api/admin/verifications")]
    public async Task<List<AdminVerificationDto>> Pending(string status = "Pending")
    {
        var query = db.VerificationRequests.AsNoTracking();
        if (Enum.TryParse<RequestStatus>(status, true, out var s)) query = query.Where(v => v.Status == s);
        return await query.OrderBy(v => v.CreatedAt).Take(200)
            .Select(v => new AdminVerificationDto(v.Id, v.UserId, v.User.Profile!.FullName, v.User.Email, v.DocumentType, v.ContentType,
                v.Status.ToString(), v.AdminNote, v.CreatedAt, v.User.Profile.DateOfBirth))
            .ToListAsync();
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("/api/admin/verifications/{id:int}/document")]
    public async Task<IActionResult> Document(int id)
    {
        var v = await db.VerificationRequests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound();
        var path = Path.Combine(PrivateFolder(env), v.FileName);
        if (!System.IO.File.Exists(path)) return NotFound(new { message = "The document was removed after review." });
        Response.Headers.CacheControl = "no-store";
        return PhysicalFile(path, v.ContentType);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("/api/admin/verifications/{id:int}/review")]
    public async Task<IActionResult> Review(int id, ReviewVerificationRequest req)
    {
        var v = await db.VerificationRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound();
        if (v.Status != RequestStatus.Pending) return BadRequest(new { message = "This request was already reviewed." });
        if (!req.Approve && string.IsNullOrWhiteSpace(req.Note))
            return BadRequest(new { message = "Tell the member why, so they can upload a better document." });

        v.Status = req.Approve ? RequestStatus.Approved : RequestStatus.Declined;
        v.AdminNote = req.Note?.Trim();
        v.ReviewedAt = DateTime.UtcNow;
        if (req.Approve)
        {
            var profile = await db.Profiles.FirstAsync(p => p.UserId == v.UserId);
            profile.IsVerified = true;
        }
        await db.SaveChangesAsync();

        // Don't keep ID documents longer than needed
        var path = Path.Combine(PrivateFolder(env), v.FileName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

        if (req.Approve)
            await notifier.NotifyAsync(v.UserId, NotificationType.VerificationApproved,
                "Your ID was verified. Your profile now shows the ✔ Verified badge.", "/my-profile");
        else
            await notifier.NotifyAsync(v.UserId, NotificationType.VerificationRejected,
                $"Your ID couldn't be verified: {v.AdminNote}", "/my-profile");
        return NoContent();
    }

    public static string PrivateFolder(IWebHostEnvironment env)
    {
        var folder = Path.Combine(env.ContentRootPath, "App_Data", "verification");
        Directory.CreateDirectory(folder);
        return folder;
    }
}
