using System.Security.Cryptography;
using System.Text;
using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

/// <summary>Email verification, phone OTP and password reset.</summary>
[ApiController]
public class AccountController(AppDbContext db, MessageSender sender, IConfiguration config) : ControllerBase
{
    private static readonly TimeSpan EmailLinkLife = TimeSpan.FromHours(24);
    private static readonly TimeSpan ResetLinkLife = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan OtpLife = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);
    private const int MaxOtpAttempts = 5;

    private string FrontendUrl => (config["App:FrontendUrl"] ?? "http://localhost:4200").TrimEnd('/');

    [Authorize]
    [HttpGet("api/account")]
    public async Task<AccountDto> Get()
    {
        var u = await db.Users.AsNoTracking().FirstAsync(x => x.Id == User.UserId());
        return new AccountDto(u.Email, u.EmailVerified, u.Phone, u.PhoneVerified);
    }

    // ---------------- Email verification ----------------

    [Authorize]
    [EnableRateLimiting("auth")]
    [HttpPost("api/account/email/send")]
    public async Task<IActionResult> SendEmailVerification()
    {
        var user = await db.Users.FirstAsync(x => x.Id == User.UserId());
        if (user.EmailVerified) return BadRequest(new { message = "Your email is already verified." });
        if (await TooSoon(user.Id, TokenPurpose.EmailVerify))
            return StatusCode(429, new { message = "Please wait a minute before asking for another email." });
        var delivery = await SendEmailVerificationAsync(db, sender, user, FrontendUrl);
        return Ok(new { delivery = delivery.ToString() });
    }

    /// <summary>Also used right after registration.</summary>
    public static async Task<Delivery> SendEmailVerificationAsync(AppDbContext db, MessageSender sender, User user, string frontendUrl)
    {
        var token = NewLinkToken();
        db.SecurityTokens.Add(new SecurityToken
        {
            UserId = user.Id, Purpose = TokenPurpose.EmailVerify, SecretHash = Hash(token), Target = user.Email,
            ExpiresAt = DateTime.UtcNow.Add(EmailLinkLife),
        });
        await db.SaveChangesAsync();
        return await sender.SendEmailAsync(user.Email, "Confirm your email – Vivaha Matrimony",
            $"Welcome to Vivaha!\n\nConfirm your email address by opening this link:\n{frontendUrl}/verify-email?token={token}\n\n" +
            "The link works for 24 hours. If you didn't create an account, ignore this email.");
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("api/auth/verify-email")]
    public async Task<IActionResult> VerifyEmail(TokenRequest req)
    {
        var t = await FindLinkToken(req.Token, TokenPurpose.EmailVerify);
        if (t is null) return BadRequest(new { message = "This link is invalid or has expired. Ask for a new one from My Profile." });
        var user = await db.Users.FirstAsync(u => u.Id == t.UserId);
        if (!string.Equals(user.Email, t.Target, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "This link is for a different email address." });
        user.EmailVerified = true;
        t.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---------------- Phone OTP ----------------

    [Authorize]
    [EnableRateLimiting("auth")]
    [HttpPost("api/account/phone/send-otp")]
    public async Task<IActionResult> SendOtp(PhoneRequest req)
    {
        var user = await db.Users.FirstAsync(x => x.Id == User.UserId());
        var phone = req.Phone.Trim();
        if (user.PhoneVerified && user.Phone == phone) return BadRequest(new { message = "This number is already verified." });
        if (await TooSoon(user.Id, TokenPurpose.PhoneOtp))
            return StatusCode(429, new { message = "Please wait a minute before asking for another code." });
        var hourAgo = DateTime.UtcNow.AddHours(-1);
        if (await db.SecurityTokens.CountAsync(t => t.UserId == user.Id && t.Purpose == TokenPurpose.PhoneOtp && t.CreatedAt >= hourAgo) >= 5)
            return StatusCode(429, new { message = "Too many codes requested. Try again in an hour." });

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        db.SecurityTokens.Add(new SecurityToken
        {
            UserId = user.Id, Purpose = TokenPurpose.PhoneOtp, SecretHash = Hash($"{user.Id}:{code}"), Target = phone,
            ExpiresAt = DateTime.UtcNow.Add(OtpLife),
        });
        await db.SaveChangesAsync();
        var delivery = await sender.SendSmsAsync(phone, $"{code} is your Vivaha verification code. It expires in 10 minutes. Don't share it with anyone.");
        return Ok(new { delivery = delivery.ToString() });
    }

    [Authorize]
    [EnableRateLimiting("auth")]
    [HttpPost("api/account/phone/verify")]
    public async Task<ActionResult<AccountDto>> VerifyOtp(OtpRequest req)
    {
        var me = User.UserId();
        var now = DateTime.UtcNow;
        var t = await db.SecurityTokens
            .Where(x => x.UserId == me && x.Purpose == TokenPurpose.PhoneOtp && x.UsedAt == null && x.ExpiresAt > now)
            .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync();
        if (t is null) return BadRequest(new { message = "The code has expired. Ask for a new one." });
        if (t.Attempts >= MaxOtpAttempts) return BadRequest(new { message = "Too many wrong tries. Ask for a new code." });

        t.Attempts++;
        if (!HashEquals(t.SecretHash, Hash($"{me}:{req.Code}")))
        {
            await db.SaveChangesAsync();
            var left = MaxOtpAttempts - t.Attempts;
            return BadRequest(new { message = left > 0 ? $"That code isn't right. {left} tries left." : "Too many wrong tries. Ask for a new code." });
        }

        var user = await db.Users.FirstAsync(u => u.Id == me);
        user.Phone = t.Target;
        user.PhoneVerified = true;
        t.UsedAt = now;
        await db.SaveChangesAsync();
        return await Get();
    }

    // ---------------- Password reset ----------------

    /// <summary>Always answers the same way, so it can't be used to find out who has an account.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("api/auth/forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive);
        if (user != null && !await TooSoon(user.Id, TokenPurpose.PasswordReset))
        {
            var token = NewLinkToken();
            db.SecurityTokens.Add(new SecurityToken
            {
                UserId = user.Id, Purpose = TokenPurpose.PasswordReset, SecretHash = Hash(token), Target = user.Email,
                ExpiresAt = DateTime.UtcNow.Add(ResetLinkLife),
            });
            await db.SaveChangesAsync();
            await sender.SendEmailAsync(user.Email, "Reset your password – Vivaha Matrimony",
                $"Someone asked to reset the password for your Vivaha account.\n\nChoose a new password here:\n{FrontendUrl}/reset-password?token={token}\n\n" +
                "The link works for 30 minutes and only once. If this wasn't you, ignore this email; your password stays the same.");
        }
        return NoContent();
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("api/auth/reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req)
    {
        var t = await FindLinkToken(req.Token, TokenPurpose.PasswordReset);
        if (t is null) return BadRequest(new { message = "This reset link is invalid or has expired. Ask for a new one." });
        var user = await db.Users.FirstAsync(u => u.Id == t.UserId);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        // The member proved they own the email address
        user.EmailVerified = true;
        t.UsedAt = DateTime.UtcNow;
        // Any other outstanding reset links stop working
        await db.SecurityTokens.Where(x => x.UserId == user.Id && x.Purpose == TokenPurpose.PasswordReset && x.UsedAt == null && x.Id != t.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.UsedAt, DateTime.UtcNow));
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---------------- Helpers ----------------

    private async Task<SecurityToken?> FindLinkToken(string token, TokenPurpose purpose)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 100) return null;
        var hash = Hash(token);
        var now = DateTime.UtcNow;
        return await db.SecurityTokens.FirstOrDefaultAsync(t =>
            t.SecretHash == hash && t.Purpose == purpose && t.UsedAt == null && t.ExpiresAt > now);
    }

    private Task<bool> TooSoon(int userId, TokenPurpose purpose)
    {
        var since = DateTime.UtcNow - ResendCooldown;
        return db.SecurityTokens.AnyAsync(t => t.UserId == userId && t.Purpose == purpose && t.CreatedAt > since);
    }

    private static string NewLinkToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Hash(string value) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static bool HashEquals(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(a), Encoding.ASCII.GetBytes(b));
}
