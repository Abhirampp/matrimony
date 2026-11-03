using Matrimony.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Data;

/// <summary>Adds an admin account and a set of demo members the first time the app runs.</summary>
public static class SeedData
{
    public const string DemoPassword = "Password@123";

    public static async Task RunAsync(AppDbContext db)
    {
        if (!await db.Users.AnyAsync()) await CreateMembersAsync(db);
        await BackfillAsync(db);
    }

    /// <summary>
    /// Fills newer profile fields (family, lifestyle, horoscope) for demo members created before they existed,
    /// and adds an album entry for any primary photo that has none.
    /// </summary>
    private static async Task BackfillAsync(AppDbContext db)
    {
        var demo = await db.Profiles.Where(p => p.User.Email.EndsWith("@demo.local") && p.Rasi == null).ToListAsync();
        foreach (var p in demo)
        {
            var rnd = new Random(p.UserId * 7919);
            string[] jobs = ["Retired", "Business", "Government Service", "Teacher", "Homemaker", "Doctor", "Farmer", "Engineer"];
            string[] diets = ["Vegetarian", "Non-Vegetarian", "Non-Vegetarian", "Eggetarian"];
            p.CreatedBy = rnd.Next(3) == 0 ? "Parent" : "Self";
            p.FamilyValues = rnd.Next(2) == 0 ? "Traditional" : "Moderate";
            p.FatherOccupation = jobs[rnd.Next(jobs.Length)];
            p.MotherOccupation = jobs[rnd.Next(jobs.Length)];
            p.Brothers = rnd.Next(0, 3);
            p.Sisters = rnd.Next(0, 3);
            p.Diet = diets[rnd.Next(diets.Length)];
            p.Smoking = "No";
            p.Drinking = rnd.Next(4) == 0 ? "Occasionally" : "No";
            p.ResidencyStatus = "Citizen";
            p.Rasi = Services.Horoscope.Rasis[rnd.Next(12)];
            p.Nakshatra = Services.Horoscope.Nakshatras[rnd.Next(27)];
            p.Manglik = rnd.Next(5) == 0 ? "Yes" : "No";
            p.BirthTime = $"{rnd.Next(0, 24):00}:{rnd.Next(0, 60):00}";
            p.BirthPlace = p.City;
        }

        var missingAlbum = await db.Profiles
            .Where(p => p.PhotoUrl != null && !db.ProfilePhotos.Any(ph => ph.UserId == p.UserId))
            .Select(p => new { p.UserId, p.PhotoUrl }).ToListAsync();
        foreach (var m in missingAlbum)
            db.ProfilePhotos.Add(new ProfilePhoto { UserId = m.UserId, Url = m.PhotoUrl!, IsPrimary = true });

        await db.SaveChangesAsync();
    }

    private static async Task CreateMembersAsync(AppDbContext db)
    {

        var hash = BCrypt.Net.BCrypt.HashPassword(DemoPassword);

        db.Users.Add(new User
        {
            Email = "admin@matrimony.local",
            PasswordHash = hash,
            Role = UserRole.Admin,
            Profile = new Profile { FullName = "Site Admin", Gender = Gender.Male, DateOfBirth = new DateTime(1985, 1, 1) }
        });

        var rnd = new Random(42);
        string[] maleNames = ["Arjun Nair", "Rahul Menon", "Vikram Iyer", "Aditya Sharma", "Karthik Reddy", "Sanjay Pillai", "Rohan Gupta", "Nikhil Das", "Abdul Rahman", "Joseph Thomas"];
        string[] femaleNames = ["Ananya Nair", "Priya Menon", "Divya Iyer", "Sneha Sharma", "Lakshmi Reddy", "Meera Pillai", "Pooja Gupta", "Kavya Das", "Ayesha Khan", "Maria George"];
        string[] religions = ["Hindu", "Hindu", "Hindu", "Muslim", "Christian"];
        string[] tongues = ["Malayalam", "Tamil", "Hindi", "Telugu", "Kannada"];
        string[] cities = ["Kochi", "Thiruvananthapuram", "Bengaluru", "Chennai", "Hyderabad", "Mumbai", "Pune", "Delhi"];
        string[] states = ["Kerala", "Kerala", "Karnataka", "Tamil Nadu", "Telangana", "Maharashtra", "Maharashtra", "Delhi"];
        string[] education = ["B.Tech", "M.Tech", "MBA", "MBBS", "B.Com", "M.Sc", "CA", "BCA"];
        string[] jobs = ["Software Engineer", "Doctor", "Teacher", "Business Owner", "Bank Officer", "Architect", "Accountant", "Data Analyst"];
        string[] incomes = ["3-5 Lakhs", "5-10 Lakhs", "10-20 Lakhs", "20+ Lakhs"];

        for (var i = 0; i < 20; i++)
        {
            var male = i < 10;
            var name = male ? maleNames[i] : femaleNames[i - 10];
            var religion = name.StartsWith("Abdul") || name.StartsWith("Ayesha") ? "Muslim"
                         : name.StartsWith("Joseph") || name.StartsWith("Maria") ? "Christian"
                         : religions[rnd.Next(3)];
            var c = rnd.Next(cities.Length);
            var age = male ? rnd.Next(25, 35) : rnd.Next(22, 31);

            db.Users.Add(new User
            {
                Email = $"{name.Split(' ')[0].ToLowerInvariant()}@demo.local",
                Phone = $"98{rnd.Next(10000000, 99999999)}",
                PasswordHash = hash,
                Profile = new Profile
                {
                    FullName = name,
                    Gender = male ? Gender.Male : Gender.Female,
                    DateOfBirth = DateTime.UtcNow.Date.AddYears(-age).AddDays(-rnd.Next(1, 300)),
                    MaritalStatus = rnd.Next(10) == 0 ? "Divorced" : "Never Married",
                    HeightCm = male ? rnd.Next(165, 186) : rnd.Next(150, 171),
                    MotherTongue = tongues[rnd.Next(tongues.Length)],
                    Religion = religion,
                    Education = education[rnd.Next(education.Length)],
                    Occupation = jobs[rnd.Next(jobs.Length)],
                    AnnualIncome = incomes[rnd.Next(incomes.Length)],
                    City = cities[c],
                    State = states[c],
                    Country = "India",
                    FamilyType = rnd.Next(2) == 0 ? "Nuclear" : "Joint",
                    About = $"Hi, I'm {name.Split(' ')[0]}. I value family, honesty and a good sense of humour. Looking for a caring life partner.",
                    PrefAgeMin = male ? 21 : 25,
                    PrefAgeMax = male ? 32 : 36,
                    PrefReligion = religion,
                    IsVerified = rnd.Next(3) > 0,
                    UpdatedAt = DateTime.UtcNow.AddMinutes(-i * 37),
                }
            });
        }
        await db.SaveChangesAsync();
    }
}
