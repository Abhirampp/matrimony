using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Services;

/// <summary>
/// Simplified horoscope compatibility using 4 of the 8 Ashtakoot factors
/// (Tara, Gana, Bhakoot, Nadi), scored out of 24. It is a guide, not a full kundli reading.
/// </summary>
public static class Horoscope
{
    public static readonly string[] Rasis =
    [
        "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)",
        "Tula (Libra)", "Vrishchika (Scorpio)", "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)",
    ];

    public static readonly string[] Nakshatras =
    [
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
        "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
        "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
    ];

    // Gana per nakshatra: D = Deva, M = Manushya, R = Rakshasa
    private const string Gana = "DMRMDMDDRRMMDRDRDRRMMDRRMMD";

    // Nadi repeats Adi, Madhya, Antya, Antya, Madhya, Adi
    private static readonly int[] NadiCycle = [0, 1, 2, 2, 1, 0];

    public static HoroscopeMatchDto? Match(Profile a, Profile b)
    {
        int na = Array.IndexOf(Nakshatras, a.Nakshatra), nb = Array.IndexOf(Nakshatras, b.Nakshatra);
        int ra = Array.IndexOf(Rasis, a.Rasi), rb = Array.IndexOf(Rasis, b.Rasi);
        if (na < 0 || nb < 0 || ra < 0 || rb < 0) return null;

        var kootas = new List<KootaDto>
        {
            new("Tara", "Birth-star harmony", Tara(na, nb) + Tara(nb, na), 3),
            new("Gana", "Temperament", GanaPoints(Gana[na], Gana[nb]), 6),
            new("Bhakoot", "Emotional & family wellbeing", Bhakoot(ra, rb), 7),
            new("Nadi", "Health & genes", NadiCycle[na % 6] == NadiCycle[nb % 6] ? 0 : 8, 8),
        };
        var score = kootas.Sum(k => k.Points);
        var max = kootas.Sum(k => k.Max);

        string? manglik = null;
        if (a.Manglik is "Yes" or "No" && b.Manglik is "Yes" or "No" && a.Manglik != b.Manglik)
            manglik = "One of you is Manglik and the other is not. Families often consult an astrologer for this.";

        var verdict = score >= 18 ? "Good match" : score >= 12 ? "Average match" : "Low match";
        return new HoroscopeMatchDto(score, max, verdict, kootas, manglik);
    }

    // Count from one star to the other; remainders 3, 5 and 7 are inauspicious.
    private static double Tara(int from, int to)
    {
        var count = (to - from + 27) % 27 + 1;
        return count % 9 is 3 or 5 or 7 ? 0 : 1.5;
    }

    private static double GanaPoints(char x, char y)
    {
        if (x == y) return 6;
        var pair = string.Concat(new[] { x, y }.Order());
        return pair switch { "DM" => 5, "DR" => 1, _ => 0 }; // M-R scores 0
    }

    // Rasi distance pairs 2/12, 5/9 and 6/8 are considered unfavourable.
    private static double Bhakoot(int a, int b)
    {
        var d = (b - a + 12) % 12 + 1;
        return d is 2 or 12 or 5 or 9 or 6 or 8 ? 0 : 7;
    }
}

public static class ProfileScoring
{
    /// <summary>
    /// Mutual match %: how well each person fits the other's partner preferences.
    /// Returns null when neither has set any preference.
    /// </summary>
    public static int? MatchScore(Profile me, Profile other)
    {
        var (m1, c1) = Fit(me, other);
        var (m2, c2) = Fit(other, me);
        var considered = c1 + c2;
        return considered == 0 ? null : (int)Math.Round(100.0 * (m1 + m2) / considered);
    }

    private static (int matched, int considered) Fit(Profile prefsOf, Profile candidate)
    {
        int matched = 0, considered = 0;
        void Check(bool applies, bool ok)
        {
            if (!applies) return;
            considered++;
            if (ok) matched++;
        }

        var age = ProfileMapper.AgeOf(candidate.DateOfBirth);
        Check(prefsOf.PrefAgeMin.HasValue || prefsOf.PrefAgeMax.HasValue,
            age >= (prefsOf.PrefAgeMin ?? 0) && age <= (prefsOf.PrefAgeMax ?? 200));
        Check(prefsOf.PrefHeightMin.HasValue, candidate.HeightCm >= prefsOf.PrefHeightMin);
        Check(IsSet(prefsOf.PrefReligion), prefsOf.PrefReligion == candidate.Religion);
        Check(IsSet(prefsOf.PrefMotherTongue), prefsOf.PrefMotherTongue == candidate.MotherTongue);
        Check(IsSet(prefsOf.PrefMaritalStatus), prefsOf.PrefMaritalStatus == candidate.MaritalStatus);
        return (matched, considered);
    }

    private static bool IsSet(string? s) => !string.IsNullOrWhiteSpace(s) && s != "Any";

    public static CompletenessDto Completeness(Profile p, int photoCount)
    {
        var checks = new (string Label, bool Done)[]
        {
            ("Profile photo", photoCount > 0),
            ("About me", !string.IsNullOrWhiteSpace(p.About)),
            ("Height", p.HeightCm.HasValue),
            ("Religion", p.Religion != null),
            ("Mother tongue", p.MotherTongue != null),
            ("Education", p.Education != null),
            ("Occupation", !string.IsNullOrWhiteSpace(p.Occupation)),
            ("Annual income", p.AnnualIncome != null),
            ("City", !string.IsNullOrWhiteSpace(p.City)),
            ("Family details", p.FatherOccupation != null || p.MotherOccupation != null || p.FamilyValues != null),
            ("Lifestyle", p.Diet != null),
            ("Horoscope", p.Rasi != null && p.Nakshatra != null),
            ("Partner preferences", p.PrefAgeMin.HasValue || p.PrefReligion != null),
            ("More than one photo", photoCount > 1),
        };
        var done = checks.Count(c => c.Done);
        return new CompletenessDto((int)Math.Round(100.0 * done / checks.Length),
            checks.Where(c => !c.Done).Select(c => c.Label).ToList());
    }
}

/// <summary>
/// What the signed-in member is allowed to see about others: blocks, connections and photo access.
/// Load once per request, then use it to build profile cards.
/// </summary>
public class ViewerContext
{
    public required Profile Me { get; init; }
    public required HashSet<int> BlockedEitherWay { get; init; }
    public required HashSet<int> Connected { get; init; }
    public required HashSet<int> PhotoAccessGranted { get; init; }

    public int MyId => Me.UserId;

    public bool CanSeePhotos(Profile p) =>
        p.UserId == MyId || p.PhotoVisibility == PhotoVisibility.Everyone ||
        Connected.Contains(p.UserId) || PhotoAccessGranted.Contains(p.UserId);

    public ProfileCardDto Card(Profile p)
    {
        var canSee = CanSeePhotos(p);
        return new ProfileCardDto(
            p.UserId, p.FullName, ProfileMapper.AgeOf(p.DateOfBirth), p.Gender.ToString(), p.HeightCm,
            p.Religion, p.Caste, p.MotherTongue, p.Education, p.Occupation,
            p.City, p.State, p.MaritalStatus,
            canSee ? p.PhotoUrl : null,
            PhotoLocked: !canSee && p.PhotoUrl != null,
            p.IsVerified,
            p.UserId == MyId ? null : ProfileScoring.MatchScore(Me, p),
            IsPremium(p));
    }

    public static bool IsPremium(Profile p) => p.PremiumPlan != null && p.PremiumUntil > DateTime.UtcNow;
    public static bool IsBoosted(Profile p) => p.PremiumPlan == "Platinum" && p.PremiumUntil > DateTime.UtcNow;

    public static async Task<ViewerContext> LoadAsync(AppDbContext db, int me)
    {
        var profile = await db.Profiles.AsNoTracking().FirstAsync(p => p.UserId == me);
        var blocked = await db.Blocks.Where(b => b.BlockerId == me || b.BlockedId == me)
            .Select(b => b.BlockerId == me ? b.BlockedId : b.BlockerId).ToListAsync();
        var connected = await db.Interests
            .Where(i => i.Status == InterestStatus.Accepted && (i.SenderId == me || i.ReceiverId == me))
            .Select(i => i.SenderId == me ? i.ReceiverId : i.SenderId).ToListAsync();
        var granted = await db.PhotoRequests
            .Where(r => r.RequesterId == me && r.Status == RequestStatus.Approved)
            .Select(r => r.OwnerId).ToListAsync();
        return new ViewerContext { Me = profile, BlockedEitherWay = [.. blocked], Connected = [.. connected], PhotoAccessGranted = [.. granted] };
    }
}

public static class BlockQueries
{
    /// <summary>True if either member has blocked the other.</summary>
    public static Task<bool> IsBlockedAsync(this AppDbContext db, int a, int b) =>
        db.Blocks.AnyAsync(x => (x.BlockerId == a && x.BlockedId == b) || (x.BlockerId == b && x.BlockedId == a));
}
