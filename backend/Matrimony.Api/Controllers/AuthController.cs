using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens, MessageSender sender, IConfiguration config) : ControllerBase
{
    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "An account with this email already exists." });

        var age = ProfileMapper.AgeOf(req.DateOfBirth);
        var minAge = req.Gender == Gender.Male ? 21 : 18;
        if (age < minAge || age > 100)
            return BadRequest(new { message = $"Minimum age is {minAge} years." });

        var user = new User
        {
            Email = email,
            Phone = req.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Profile = new Profile
            {
                FullName = req.FullName.Trim(),
                Gender = req.Gender,
                DateOfBirth = req.DateOfBirth.Date,
                CreatedBy = string.IsNullOrWhiteSpace(req.CreatedBy) ? "Self" : req.CreatedBy,
            }
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        await AccountController.SendEmailVerificationAsync(db, sender, user, (config["App:FrontendUrl"] ?? "http://localhost:4200").TrimEnd('/'));

        return new AuthResponse(tokens.CreateToken(user), user.Id, user.Email, user.Profile.FullName, user.Role.ToString(), false);
    }

    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });
        if (!user.IsActive)
            return Unauthorized(new { message = "Your account has been deactivated. Please contact support." });

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var complete = user.Profile is { Religion: not null, City: not null, Education: not null };
        return new AuthResponse(tokens.CreateToken(user), user.Id, user.Email, user.Profile?.FullName ?? "", user.Role.ToString(), complete);
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var user = await db.Users.FindAsync(User.UserId());
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect." });
        if (req.NewPassword.Length < 6)
            return BadRequest(new { message = "New password must be at least 6 characters." });
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
