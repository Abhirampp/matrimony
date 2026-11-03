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
[Route("api/profiles")]
public class ProfilesController(AppDbContext db, IWebHostEnvironment env, PlanService plans) : ControllerBase
{
    public const int MaxPhotos = 6;
    private static readonly string[] AllowedPhotoTypes = [".jpg", ".jpeg", ".png", ".webp"];

    // ---------------- Own profile ----------------

    [HttpGet("me")]
    public async Task<ActionResult<ProfileDetailDto>> GetMine()
    {
        var me = User.UserId();
        var p = await db.Profiles.Include(x => x.User).FirstOrDefaultAsync(x => x.UserId == me);
        if (p is null) return NotFound();
        var photos = await PhotosOf(me);
        return ToDetail(p, photos, isSelf: true, ctx: null, interest: null, shortlisted: false, photoRequest: null, contactUnlocked: false);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMine(ProfileUpdateRequest r)
    {
        if (r.Rasi != null && !Horoscope.Rasis.Contains(r.Rasi)) return BadRequest(new { message = "Unknown rasi." });
        if (r.Nakshatra != null && !Horoscope.Nakshatras.Contains(r.Nakshatra)) return BadRequest(new { message = "Unknown nakshatra." });

        var me = User.UserId();
        var p = await db.Profiles.FirstOrDefaultAsync(x => x.UserId == me);
        if (p is null) return NotFound();

        p.FullName = r.FullName.Trim();
        p.Gender = r.Gender;
        p.DateOfBirth = r.DateOfBirth.Date;
        p.MaritalStatus = r.MaritalStatus;
        p.HeightCm = r.HeightCm;
        p.MotherTongue = r.MotherTongue;
        p.Religion = r.Religion;
        p.Caste = r.Caste;
        p.Education = r.Education;
        p.Occupation = r.Occupation;
        p.AnnualIncome = r.AnnualIncome;
        p.City = r.City;
        p.State = r.State;
        p.Country = r.Country;
        p.ResidencyStatus = r.ResidencyStatus;
        p.CreatedBy = r.CreatedBy;
        p.FamilyType = r.FamilyType;
        p.FamilyValues = r.FamilyValues;
        p.FatherOccupation = r.FatherOccupation;
        p.MotherOccupation = r.MotherOccupation;
        p.Brothers = r.Brothers;
        p.Sisters = r.Sisters;
        p.Diet = r.Diet;
        p.Smoking = r.Smoking;
        p.Drinking = r.Drinking;
        p.Rasi = r.Rasi;
        p.Nakshatra = r.Nakshatra;
        p.Manglik = r.Manglik;
        p.BirthTime = r.BirthTime;
        p.BirthPlace = r.BirthPlace;
        p.About = r.About;
        p.PrefAgeMin = r.PrefAgeMin;
        p.PrefAgeMax = r.PrefAgeMax;
        p.PrefHeightMin = r.PrefHeightMin;
        p.PrefReligion = r.PrefReligion;
        p.PrefMotherTongue = r.PrefMotherTongue;
        p.PrefMaritalStatus = r.PrefMaritalStatus;
        p.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("me/privacy")]
    public async Task<IActionResult> UpdatePrivacy(PrivacyRequest r)
    {
        var me = User.UserId();
        var p = await db.Profiles.FirstAsync(x => x.UserId == me);
        p.PhotoVisibility = r.PhotoVisibility;
        p.IsHidden = r.IsHidden;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---------------- Photo album ----------------

    [HttpPost("me/photos")]
    [RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<ActionResult<List<PhotoDto>>> UploadPhoto(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });
        if (file.Length > 2 * 1024 * 1024) return BadRequest(new { message = "Photo must be 2 MB or smaller." });
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedPhotoTypes.Contains(ext)) return BadRequest(new { message = "Only JPG, PNG or WEBP images are allowed." });

        var me = User.UserId();
        var count = await db.ProfilePhotos.CountAsync(x => x.UserId == me);
        if (count >= MaxPhotos) return BadRequest(new { message = $"You can add up to {MaxPhotos} photos. Delete one first." });

        var name = $"{me}_{Guid.NewGuid():N}{ext}";
        await using (var fs = System.IO.File.Create(Path.Combine(UploadFolder(), name)))
            await file.CopyToAsync(fs);

        var photo = new ProfilePhoto { UserId = me, Url = $"/uploads/{name}", IsPrimary = count == 0 };
        db.ProfilePhotos.Add(photo);
        if (photo.IsPrimary) await SetPrimaryUrl(me, photo.Url);
        await db.SaveChangesAsync();
        return await PhotosOf(me);
    }

    [HttpPost("me/photos/{id:int}/primary")]
    public async Task<ActionResult<List<PhotoDto>>> MakePrimary(int id)
    {
        var me = User.UserId();
        var photos = await db.ProfilePhotos.Where(x => x.UserId == me).ToListAsync();
        var chosen = photos.FirstOrDefault(x => x.Id == id);
        if (chosen is null) return NotFound();
        foreach (var ph in photos) ph.IsPrimary = ph.Id == id;
        await SetPrimaryUrl(me, chosen.Url);
        await db.SaveChangesAsync();
        return await PhotosOf(me);
    }

    [HttpDelete("me/photos/{id:int}")]
    public async Task<ActionResult<List<PhotoDto>>> DeletePhoto(int id)
    {
        var me = User.UserId();
        var photo = await db.ProfilePhotos.FirstOrDefaultAsync(x => x.Id == id && x.UserId == me);
        if (photo is null) return NotFound();
        db.ProfilePhotos.Remove(photo);

        if (photo.Url.StartsWith("/uploads/"))
        {
            var path = Path.Combine(UploadFolder(), Path.GetFileName(photo.Url));
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        }

        if (photo.IsPrimary)
        {
            var next = await db.ProfilePhotos.Where(x => x.UserId == me && x.Id != id).OrderBy(x => x.CreatedAt).FirstOrDefaultAsync();
            if (next != null) next.IsPrimary = true;
            await SetPrimaryUrl(me, next?.Url);
        }
        await db.SaveChangesAsync();
        return await PhotosOf(me);
    }

    // ---------------- Other members ----------------

    [HttpGet("{userId:int}")]
    public async Task<ActionResult<ProfileDetailDto>> Get(int userId)
    {
        var me = User.UserId();
        if (userId == me) return await GetMine();

        var ctx = await ViewerContext.LoadAsync(db, me);
        var blockedByMe = await db.Blocks.AnyAsync(b => b.BlockerId == me && b.BlockedId == userId);
        // Someone who blocked you simply disappears
        if (ctx.BlockedEitherWay.Contains(userId) && !blockedByMe) return NotFound();

        var p = await db.Profiles.Include(x => x.User).FirstOrDefaultAsync(x => x.UserId == userId && x.User.IsActive);
        if (p is null) return NotFound();

        var interest = await db.Interests.FirstOrDefaultAsync(i =>
            (i.SenderId == me && i.ReceiverId == userId) || (i.SenderId == userId && i.ReceiverId == me));
        var shortlisted = await db.Shortlists.AnyAsync(s => s.UserId == me && s.ShortlistedUserId == userId);
        var photoRequest = await db.PhotoRequests.FirstOrDefaultAsync(r => r.RequesterId == me && r.OwnerId == userId);

        // Record a profile view (at most one per viewer per day)
        var since = DateTime.UtcNow.Date;
        if (!blockedByMe && !await db.ProfileViews.AnyAsync(v => v.ViewerId == me && v.ViewedUserId == userId && v.ViewedAt >= since))
        {
            db.ProfileViews.Add(new ProfileView { ViewerId = me, ViewedUserId = userId });
            await db.SaveChangesAsync();
        }

        var photos = ctx.CanSeePhotos(p) ? await PhotosOf(userId) : [];
        var unlocked = await db.ContactViews.AnyAsync(c => c.UserId == me && c.ViewedUserId == userId);
        var dto = ToDetail(p, photos, isSelf: false, ctx, interest, shortlisted, photoRequest, unlocked);
        return dto with { BlockedByMe = blockedByMe };
    }

    /// <summary>
    /// Reveal a member's contact details. Free after an accepted interest; otherwise uses one
    /// contact-view credit from a paid plan (only the first time for each profile).
    /// </summary>
    [HttpPost("{userId:int}/contact")]
    public async Task<ActionResult<ContactDto>> UnlockContact(int userId)
    {
        var me = User.UserId();
        if (userId == me) return BadRequest();
        if (await db.IsBlockedAsync(me, userId)) return NotFound();
        var target = await db.Profiles.Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.User.IsActive && p.User.Role == UserRole.User);
        if (target is null) return NotFound();

        var status = await plans.StatusAsync(me);
        var connected = await db.Interests.AnyAsync(i => i.Status == InterestStatus.Accepted &&
            ((i.SenderId == me && i.ReceiverId == userId) || (i.SenderId == userId && i.ReceiverId == me)));
        var alreadyUnlocked = await db.ContactViews.AnyAsync(c => c.UserId == me && c.ViewedUserId == userId);

        if (!connected && !alreadyUnlocked)
        {
            if (status.Subscription is null)
                return StatusCode(402, new { message = "Upgrade to a paid plan to view contact details before an interest is accepted." });
            if (status.ContactViewsLeft <= 0)
                return StatusCode(402, new { message = "You've used all the contact views in your plan. Renew or upgrade to get more." });

            status.Subscription.ContactViewsUsed++;
            db.ContactViews.Add(new ContactView { UserId = me, ViewedUserId = userId });
            await db.SaveChangesAsync();
        }
        return new ContactDto(target.User.Email, target.User.Phone, status.ContactViewsLeft);
    }

    [HttpGet("search")]
    public async Task<ActionResult<PagedResult<ProfileCardDto>>> Search([FromQuery] SearchQuery q)
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var query = Candidates(ctx);

        var today = DateTime.UtcNow.Date;
        if (q.AgeMin is int amin) query = query.Where(p => p.DateOfBirth <= today.AddYears(-amin));
        if (q.AgeMax is int amax) query = query.Where(p => p.DateOfBirth > today.AddYears(-(amax + 1)));
        if (q.HeightMin is int h) query = query.Where(p => p.HeightCm >= h);
        if (!string.IsNullOrWhiteSpace(q.Religion)) query = query.Where(p => p.Religion == q.Religion);
        if (!string.IsNullOrWhiteSpace(q.Caste)) query = query.Where(p => p.Caste!.Contains(q.Caste));
        if (!string.IsNullOrWhiteSpace(q.MotherTongue)) query = query.Where(p => p.MotherTongue == q.MotherTongue);
        if (!string.IsNullOrWhiteSpace(q.MaritalStatus)) query = query.Where(p => p.MaritalStatus == q.MaritalStatus);
        if (!string.IsNullOrWhiteSpace(q.City)) query = query.Where(p => p.City!.Contains(q.City));
        if (!string.IsNullOrWhiteSpace(q.Education)) query = query.Where(p => p.Education!.Contains(q.Education));
        if (!string.IsNullOrWhiteSpace(q.Diet)) query = query.Where(p => p.Diet == q.Diet);
        if (!string.IsNullOrWhiteSpace(q.Keyword))
            query = query.Where(p => p.FullName.Contains(q.Keyword) || p.Occupation!.Contains(q.Keyword) || p.About!.Contains(q.Keyword));
        if (q.PhotoOnly) query = query.Where(p => p.PhotoUrl != null);
        if (q.VerifiedOnly) query = query.Where(p => p.IsVerified);

        var page = Math.Max(1, q.Page);
        var size = Math.Clamp(q.PageSize, 1, 50);
        var total = await query.CountAsync();
        // Platinum members (profile boost) come first
        var now = DateTime.UtcNow;
        var items = await query
            .OrderByDescending(p => p.PremiumPlan == "Platinum" && p.PremiumUntil > now)
            .ThenByDescending(p => p.UpdatedAt)
            .Skip((page - 1) * size).Take(size).ToListAsync();
        return new PagedResult<ProfileCardDto>(items.Select(ctx.Card).ToList(), total, page, size);
    }

    /// <summary>Profiles that fit the member's partner preferences, best match first.</summary>
    [HttpGet("matches")]
    public async Task<ActionResult<PagedResult<ProfileCardDto>>> Matches(int page = 1, int pageSize = 12)
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var me = ctx.Me;
        var query = Candidates(ctx);
        var today = DateTime.UtcNow.Date;

        if (me.PrefAgeMin is int amin) query = query.Where(p => p.DateOfBirth <= today.AddYears(-amin));
        if (me.PrefAgeMax is int amax) query = query.Where(p => p.DateOfBirth > today.AddYears(-(amax + 1)));
        if (me.PrefHeightMin is int h) query = query.Where(p => p.HeightCm >= h);
        if (!string.IsNullOrWhiteSpace(me.PrefReligion) && me.PrefReligion != "Any") query = query.Where(p => p.Religion == me.PrefReligion);
        if (!string.IsNullOrWhiteSpace(me.PrefMotherTongue) && me.PrefMotherTongue != "Any") query = query.Where(p => p.MotherTongue == me.PrefMotherTongue);
        if (!string.IsNullOrWhiteSpace(me.PrefMaritalStatus) && me.PrefMaritalStatus != "Any") query = query.Where(p => p.MaritalStatus == me.PrefMaritalStatus);

        // Hide people the member already has an interest with
        var myId = me.UserId;
        query = query.Where(p => !db.Interests.Any(i =>
            (i.SenderId == myId && i.ReceiverId == p.UserId) || (i.SenderId == p.UserId && i.ReceiverId == myId)));

        // Rank in memory by mutual match score (capped so this stays cheap)
        var pool = await query.OrderByDescending(p => p.UpdatedAt).Take(300).ToListAsync();
        var boosted = pool.Where(ViewerContext.IsBoosted).Select(p => p.UserId).ToHashSet();
        var ranked = pool.Select(ctx.Card)
            .OrderByDescending(c => boosted.Contains(c.UserId))
            .ThenByDescending(c => c.MatchScore ?? 0).ThenByDescending(c => c.PhotoUrl != null).ToList();

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        return new PagedResult<ProfileCardDto>(ranked.Skip((page - 1) * pageSize).Take(pageSize).ToList(), ranked.Count, page, pageSize);
    }

    /// <summary>Members who joined in the last 30 days, newest first.</summary>
    [HttpGet("recent")]
    public async Task<ActionResult<List<ProfileCardDto>>> Recent(int take = 12)
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var since = DateTime.UtcNow.AddDays(-30);
        var items = await Candidates(ctx).Where(p => p.User.CreatedAt >= since)
            .OrderByDescending(p => p.User.CreatedAt).Take(Math.Clamp(take, 1, 50)).ToListAsync();
        return items.Select(ctx.Card).ToList();
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> Dashboard()
    {
        var me = User.UserId();
        var p = await db.Profiles.AsNoTracking().FirstAsync(x => x.UserId == me);
        var photoCount = await db.ProfilePhotos.CountAsync(x => x.UserId == me);
        return new DashboardDto(
            await db.Interests.CountAsync(i => i.ReceiverId == me),
            await db.Interests.CountAsync(i => i.ReceiverId == me && i.Status == InterestStatus.Pending),
            await db.Interests.CountAsync(i => (i.ReceiverId == me || i.SenderId == me) && i.Status == InterestStatus.Accepted),
            await db.Shortlists.CountAsync(s => s.UserId == me),
            await db.ProfileViews.CountAsync(v => v.ViewedUserId == me),
            await db.Messages.CountAsync(m => m.ReceiverId == me && !m.IsRead),
            await db.PhotoRequests.CountAsync(r => r.OwnerId == me && r.Status == RequestStatus.Pending),
            ProfileScoring.Completeness(p, photoCount),
            p.IsHidden);
    }

    /// <summary>Who viewed my profile. Free members only see how many; paid plans see the list.</summary>
    [HttpGet("visitors")]
    public async Task<ActionResult<VisitorsDto>> Visitors()
    {
        var ctx = await ViewerContext.LoadAsync(db, User.UserId());
        var me = ctx.MyId;
        var ids = await db.ProfileViews.Where(v => v.ViewedUserId == me)
            .GroupBy(v => v.ViewerId)
            .Select(g => new { Id = g.Key, Last = g.Max(v => v.ViewedAt) })
            .OrderByDescending(x => x.Last).Take(30).Select(x => x.Id).ToListAsync();
        ids = ids.Where(id => !ctx.BlockedEitherWay.Contains(id)).ToList();

        var status = await plans.StatusAsync(me);
        if (!status.Plan.SeeVisitors) return new VisitorsDto(true, ids.Count, []);

        var profiles = await db.Profiles.AsNoTracking().Where(p => ids.Contains(p.UserId) && p.User.IsActive).ToListAsync();
        var items = ids.Select(id => profiles.FirstOrDefault(p => p.UserId == id)).OfType<Profile>().Select(ctx.Card).ToList();
        return new VisitorsDto(false, items.Count, items);
    }

    // ---------------- Helpers ----------------

    // Opposite gender, active, visible, not blocked either way, not me
    private IQueryable<Profile> Candidates(ViewerContext ctx)
    {
        var me = ctx.Me;
        var blocked = ctx.BlockedEitherWay.ToList();
        return db.Profiles.AsNoTracking()
            .Where(p => p.User.IsActive && !p.IsHidden && p.UserId != me.UserId && p.Gender != me.Gender
                        && p.User.Role == UserRole.User && !blocked.Contains(p.UserId));
    }

    private async Task<List<PhotoDto>> PhotosOf(int userId) =>
        await db.ProfilePhotos.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.IsPrimary).ThenBy(x => x.CreatedAt)
            .Select(x => new PhotoDto(x.Id, x.Url, x.IsPrimary)).ToListAsync();

    private async Task SetPrimaryUrl(int userId, string? url)
    {
        var p = await db.Profiles.FirstAsync(x => x.UserId == userId);
        p.PhotoUrl = url;
        p.UpdatedAt = DateTime.UtcNow;
    }

    private string UploadFolder()
    {
        var folder = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads");
        Directory.CreateDirectory(folder);
        return folder;
    }

    private static ProfileDetailDto ToDetail(Profile p, List<PhotoDto> photos, bool isSelf, ViewerContext? ctx,
        Interest? interest, bool shortlisted, PhotoRequest? photoRequest, bool contactUnlocked)
    {
        var accepted = interest?.Status == InterestStatus.Accepted;
        var connected = isSelf || accepted;
        var showContact = connected || contactUnlocked;
        var canSeePhotos = isSelf || ctx!.CanSeePhotos(p);
        return new ProfileDetailDto(
            p.UserId, p.FullName, ProfileMapper.AgeOf(p.DateOfBirth), p.Gender.ToString(), p.DateOfBirth, p.HeightCm,
            p.MaritalStatus, p.MotherTongue, p.Religion, p.Caste, p.Education, p.Occupation, p.AnnualIncome,
            p.City, p.State, p.Country, p.ResidencyStatus, p.CreatedBy,
            p.FamilyType, p.FamilyValues, p.FatherOccupation, p.MotherOccupation, p.Brothers, p.Sisters,
            p.Diet, p.Smoking, p.Drinking,
            p.Rasi, p.Nakshatra, p.Manglik,
            // Exact birth details are only shared once connected
            connected ? p.BirthTime : null, connected ? p.BirthPlace : null,
            p.About,
            canSeePhotos ? p.PhotoUrl : null, photos, !canSeePhotos && p.PhotoUrl != null,
            p.PhotoVisibility.ToString(), photoRequest?.Status.ToString(),
            p.PrefAgeMin, p.PrefAgeMax, p.PrefHeightMin, p.PrefReligion, p.PrefMotherTongue, p.PrefMaritalStatus,
            p.IsVerified, isSelf && p.IsHidden,
            interest?.Status.ToString(), interest?.SenderId == ctx?.MyId, shortlisted, accepted, false,
            ctx is null ? null : ProfileScoring.MatchScore(ctx.Me, p),
            ctx is null ? null : Horoscope.Match(ctx.Me, p),
            showContact ? p.User.Email : null, showContact ? p.User.Phone : null,
            isSelf ? ProfileScoring.Completeness(p, photos.Count) : null,
            ViewerContext.IsPremium(p),
            contactUnlocked && !accepted);
    }
}
