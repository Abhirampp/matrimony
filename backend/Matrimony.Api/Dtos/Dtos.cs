using System.ComponentModel.DataAnnotations;
using Matrimony.Api.Models;

namespace Matrimony.Api.Dtos;

// ---------- Auth ----------
public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    [Required, MaxLength(100)] string FullName,
    [Required] Gender Gender,
    [Required] DateTime DateOfBirth,
    string? Phone,
    string? CreatedBy);

public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

public record AuthResponse(string Token, int UserId, string Email, string FullName, string Role, bool ProfileComplete);

// ---------- Profile ----------
public record ProfileUpdateRequest(
    [Required, MaxLength(100)] string FullName,
    Gender Gender,
    DateTime DateOfBirth,
    string MaritalStatus,
    int? HeightCm,
    string? MotherTongue,
    string? Religion,
    string? Caste,
    string? Education,
    string? Occupation,
    string? AnnualIncome,
    string? City,
    string? State,
    string? Country,
    string? ResidencyStatus,
    string? CreatedBy,
    string? FamilyType,
    string? FamilyValues,
    string? FatherOccupation,
    string? MotherOccupation,
    [Range(0, 20)] int? Brothers,
    [Range(0, 20)] int? Sisters,
    string? Diet,
    string? Smoking,
    string? Drinking,
    string? Rasi,
    string? Nakshatra,
    string? Manglik,
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$")] string? BirthTime,
    string? BirthPlace,
    [MaxLength(2000)] string? About,
    int? PrefAgeMin,
    int? PrefAgeMax,
    int? PrefHeightMin,
    string? PrefReligion,
    string? PrefMotherTongue,
    string? PrefMaritalStatus);

public record PrivacyRequest(PhotoVisibility PhotoVisibility, bool IsHidden);

public record ProfileCardDto(
    int UserId, string FullName, int Age, string Gender, int? HeightCm,
    string? Religion, string? Caste, string? MotherTongue, string? Education, string? Occupation,
    string? City, string? State, string MaritalStatus, string? PhotoUrl, bool PhotoLocked, bool IsVerified,
    int? MatchScore, bool IsPremium);

public record PhotoDto(int Id, string Url, bool IsPrimary);

public record KootaDto(string Name, string Meaning, double Points, double Max);
public record HoroscopeMatchDto(double Score, double Max, string Verdict, List<KootaDto> Kootas, string? ManglikNote);
public record CompletenessDto(int Percent, List<string> Missing);

public record ProfileDetailDto(
    int UserId, string FullName, int Age, string Gender, DateTime DateOfBirth, int? HeightCm,
    string MaritalStatus, string? MotherTongue, string? Religion, string? Caste,
    string? Education, string? Occupation, string? AnnualIncome,
    string? City, string? State, string? Country, string? ResidencyStatus, string? CreatedBy,
    string? FamilyType, string? FamilyValues, string? FatherOccupation, string? MotherOccupation, int? Brothers, int? Sisters,
    string? Diet, string? Smoking, string? Drinking,
    string? Rasi, string? Nakshatra, string? Manglik, string? BirthTime, string? BirthPlace,
    string? About,
    // Photos: empty when the viewer may not see them
    string? PhotoUrl, List<PhotoDto> Photos, bool PhotoLocked, string PhotoVisibility, string? PhotoRequestStatus,
    int? PrefAgeMin, int? PrefAgeMax, int? PrefHeightMin, string? PrefReligion, string? PrefMotherTongue, string? PrefMaritalStatus,
    bool IsVerified, bool IsHidden,
    // Relationship with the viewer
    string? InterestStatus, bool InterestSentByMe, bool IsShortlisted, bool CanMessage, bool BlockedByMe,
    int? MatchScore, HoroscopeMatchDto? HoroscopeMatch,
    // Contact is only revealed after an accepted interest
    string? Email, string? Phone,
    // Only filled in for the owner
    CompletenessDto? Completeness,
    bool IsPremium,
    // True when the viewer unlocked these contact details with a paid-plan credit
    bool ContactUnlocked);

public record ContactDto(string? Email, string? Phone, int ContactViewsLeft);
public record VisitorsDto(bool Locked, int Count, List<ProfileCardDto> Items);

// ---------- Plans & payments ----------
public record PlanDto(string Code, string Name, int PriceInr, int Months, int? InterestsPerDay, int ContactViews,
    bool SeeVisitors, bool Boost, bool Badge, string[] Highlights);
public record MyPlanDto(PlanDto Plan, bool IsPaid, DateTime? StartsAt, DateTime? EndsAt, int ContactViewsLeft, int ContactViewsTotal,
    int InterestsToday, int? InterestsPerDay);
public record CreateOrderRequest([Required] string PlanCode);
public record CheckoutDto(int OrderId, string Provider, int Amount, string Currency, string PlanName,
    string? ProviderOrderId, string? KeyId, string Name, string Email, string? Phone);
public record VerifyPaymentRequest(int OrderId, string? RazorpayOrderId, string? RazorpayPaymentId, string? RazorpaySignature, bool Demo);
public record OrderDto(int Id, string PlanCode, string PlanName, int Amount, string Currency, string Status, string Provider,
    string? ProviderPaymentId, string? InvoiceNumber, DateTime CreatedAt, DateTime? PaidAt);
public record InvoiceDto(OrderDto Order, string BilledTo, string Email, string? Phone, DateTime? PlanStarts, DateTime? PlanEnds,
    string SellerName, string SellerAddress);
public record AdminOrderDto(int Id, int UserId, string FullName, string Email, string PlanCode, int Amount, string Status, string Provider,
    string? InvoiceNumber, DateTime CreatedAt, DateTime? PaidAt);
public record RevenueDto(int PaidOrders, long TotalPaise, int ActiveGold, int ActivePlatinum);
public record GrantPlanRequest([Required] string PlanCode, [MaxLength(200)] string? Reason);

// ---------- Account security ----------
public record ForgotPasswordRequest([Required, EmailAddress] string Email);
public record ResetPasswordRequest([Required] string Token, [Required, MinLength(6)] string NewPassword);
public record TokenRequest([Required] string Token);
public record PhoneRequest([Required, RegularExpression(@"^\+?[0-9]{10,15}$", ErrorMessage = "Enter a valid mobile number.")] string Phone);
public record OtpRequest([Required, RegularExpression(@"^\d{6}$", ErrorMessage = "Enter the 6-digit code.")] string Code);
public record AccountDto(string Email, bool EmailVerified, string? Phone, bool PhoneVerified);

// ---------- Success stories ----------
public record StoryRequest([Required, MaxLength(100)] string CoupleNames, [Required, MaxLength(120)] string Title,
    [Required, MinLength(40), MaxLength(3000)] string Story, DateTime? WeddingDate, [MaxLength(60)] string? City);
public record StoryDto(int Id, string CoupleNames, string Title, string Story, DateTime? WeddingDate, string? City,
    string Status, DateTime CreatedAt);
public record OutboxDto(int Id, string Channel, string To, string Subject, string Body, DateTime CreatedAt);

public class SearchQuery
{
    public int? AgeMin { get; set; }
    public int? AgeMax { get; set; }
    public int? HeightMin { get; set; }
    public string? Religion { get; set; }
    public string? Caste { get; set; }
    public string? MotherTongue { get; set; }
    public string? MaritalStatus { get; set; }
    public string? City { get; set; }
    public string? Education { get; set; }
    public string? Diet { get; set; }
    public string? Keyword { get; set; }
    public bool PhotoOnly { get; set; }
    public bool VerifiedOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

// ---------- Interests & photo requests ----------
public record InterestDto(int Id, ProfileCardDto Profile, string Status, DateTime CreatedAt, bool SentByMe);
public record RespondInterestRequest(bool Accept);
public record PhotoRequestDto(int Id, ProfileCardDto Profile, string Status, DateTime CreatedAt);
public record RespondPhotoRequest(bool Approve);

// ---------- Safety ----------
public record ReportRequest([Required, MaxLength(50)] string Reason, [MaxLength(1000)] string? Details);
public record BlockedUserDto(int UserId, string FullName, DateTime BlockedAt);
public record AdminReportDto(int Id, int ReporterId, string ReporterName, int ReportedId, string ReportedName, bool ReportedIsActive,
    string Reason, string? Details, string Status, string? AdminNote, DateTime CreatedAt, int ReportsAgainstUser);
public record ResolveReportRequest(bool BlockUser, [MaxLength(500)] string? Note);

// ---------- Messages ----------
public record SendMessageRequest([Required, MaxLength(2000)] string Content);
public record MessageDto(int Id, int SenderId, int ReceiverId, string Content, DateTime SentAt, bool IsRead);
public record ConversationDto(ProfileCardDto With, string? LastMessage, DateTime? LastAt, int Unread);

// ---------- Notifications ----------
public record NotificationDto(int Id, string Type, string Text, string? Link, int? ActorId, bool IsRead, DateTime CreatedAt);
public record BadgesDto(int Notifications, int Messages);

// ---------- Saved searches ----------
public record SavedSearchRequest([Required, MaxLength(60)] string Name, [Required] SearchQuery Query);
public record SavedSearchDto(int Id, string Name, SearchQuery Query, DateTime CreatedAt);

// ---------- Verification ----------
public record VerificationStatusDto(bool IsVerified, string? Status, string? DocumentType, string? AdminNote, DateTime? SubmittedAt);
public record AdminVerificationDto(int Id, int UserId, string FullName, string Email, string DocumentType, string ContentType,
    string Status, string? AdminNote, DateTime CreatedAt, DateTime DateOfBirth);
public record ReviewVerificationRequest(bool Approve, [MaxLength(500)] string? Note);

// ---------- Dashboard / Admin ----------
public record DashboardDto(int InterestsReceived, int PendingInterests, int Accepted, int Shortlisted, int ProfileViews,
    int UnreadMessages, int PendingPhotoRequests, CompletenessDto Completeness, bool IsHidden);
public record AdminUserDto(int Id, string Email, string? FullName, string Role, bool IsActive, bool IsVerified, DateTime CreatedAt, DateTime? LastLoginAt);
public record AdminStatsDto(int TotalUsers, int ActiveUsers, int Male, int Female, int VerifiedProfiles, int Interests, int AcceptedInterests,
    int Messages, int OpenReports, int PendingVerifications, int PendingStories, RevenueDto Revenue);
