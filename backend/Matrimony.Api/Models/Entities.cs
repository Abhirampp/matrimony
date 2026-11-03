using System.ComponentModel.DataAnnotations;

namespace Matrimony.Api.Models;

public enum UserRole { User = 0, Admin = 1 }
public enum Gender { Male = 0, Female = 1 }
public enum InterestStatus { Pending = 0, Accepted = 1, Declined = 2 }
public enum PhotoVisibility { Everyone = 0, Protected = 1 }
public enum RequestStatus { Pending = 0, Approved = 1, Declined = 2 }
public enum ReportStatus { Open = 0, Dismissed = 1, ActionTaken = 2 }

public class User
{
    public int Id { get; set; }
    [MaxLength(256)] public string Email { get; set; } = "";
    [MaxLength(20)] public string? Phone { get; set; }
    public string PasswordHash { get; set; } = "";
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public bool EmailVerified { get; set; }
    public bool PhoneVerified { get; set; }

    public Profile? Profile { get; set; }
}

public class Profile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Basic details
    [MaxLength(100)] public string FullName { get; set; } = "";
    public Gender Gender { get; set; }
    public DateTime DateOfBirth { get; set; }
    [MaxLength(30)] public string MaritalStatus { get; set; } = "Never Married";
    public int? HeightCm { get; set; }
    [MaxLength(50)] public string? MotherTongue { get; set; }

    // Religion & community
    [MaxLength(50)] public string? Religion { get; set; }
    [MaxLength(50)] public string? Caste { get; set; }

    // Education & career
    [MaxLength(100)] public string? Education { get; set; }
    [MaxLength(100)] public string? Occupation { get; set; }
    [MaxLength(50)] public string? AnnualIncome { get; set; }

    // Location
    [MaxLength(60)] public string? City { get; set; }
    [MaxLength(60)] public string? State { get; set; }
    [MaxLength(60)] public string? Country { get; set; } = "India";

    [MaxLength(40)] public string? ResidencyStatus { get; set; }

    // Who manages the profile (Self, Parent, Sibling, Relative, Friend)
    [MaxLength(20)] public string? CreatedBy { get; set; } = "Self";

    // Family
    [MaxLength(30)] public string? FamilyType { get; set; }
    [MaxLength(30)] public string? FamilyValues { get; set; }
    [MaxLength(100)] public string? FatherOccupation { get; set; }
    [MaxLength(100)] public string? MotherOccupation { get; set; }
    public int? Brothers { get; set; }
    public int? Sisters { get; set; }

    // Lifestyle
    [MaxLength(30)] public string? Diet { get; set; }
    [MaxLength(20)] public string? Smoking { get; set; }
    [MaxLength(20)] public string? Drinking { get; set; }

    // Horoscope
    [MaxLength(20)] public string? Rasi { get; set; }
    [MaxLength(30)] public string? Nakshatra { get; set; }
    [MaxLength(20)] public string? Manglik { get; set; }
    [MaxLength(10)] public string? BirthTime { get; set; }
    [MaxLength(100)] public string? BirthPlace { get; set; }

    [MaxLength(2000)] public string? About { get; set; }

    /// <summary>Primary photo, kept here so list queries don't need a join.</summary>
    [MaxLength(300)] public string? PhotoUrl { get; set; }
    public PhotoVisibility PhotoVisibility { get; set; } = PhotoVisibility.Everyone;

    /// <summary>Hidden profiles don't appear in search or matches; existing connections still work.</summary>
    public bool IsHidden { get; set; }

    /// <summary>
    /// Copy of the active paid plan (the Subscriptions table is the source of truth), kept here so
    /// search can rank boosted profiles and cards can show a Premium badge without a join.
    /// </summary>
    [MaxLength(20)] public string? PremiumPlan { get; set; }
    public DateTime? PremiumUntil { get; set; }

    // Partner preferences
    public int? PrefAgeMin { get; set; }
    public int? PrefAgeMax { get; set; }
    public int? PrefHeightMin { get; set; }
    [MaxLength(50)] public string? PrefReligion { get; set; }
    [MaxLength(50)] public string? PrefMotherTongue { get; set; }
    [MaxLength(30)] public string? PrefMaritalStatus { get; set; }

    public bool IsVerified { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Interest
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public int ReceiverId { get; set; }
    public User Receiver { get; set; } = null!;
    public InterestStatus Status { get; set; } = InterestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
}

public class Shortlist
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ShortlistedUserId { get; set; }
    public User ShortlistedUser { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Message
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public int ReceiverId { get; set; }
    [MaxLength(2000)] public string Content { get; set; } = "";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }
}

public class ProfilePhoto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(300)] public string Url { get; set; } = "";
    public bool IsPrimary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A request to see someone's protected photos.</summary>
public class PhotoRequest
{
    public int Id { get; set; }
    public int RequesterId { get; set; }
    public User Requester { get; set; } = null!;
    public int OwnerId { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Block
{
    public int Id { get; set; }
    public int BlockerId { get; set; }
    public int BlockedId { get; set; }
    public User Blocked { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Report
{
    public int Id { get; set; }
    public int ReporterId { get; set; }
    public User Reporter { get; set; } = null!;
    public int ReportedId { get; set; }
    public User Reported { get; set; } = null!;
    [MaxLength(50)] public string Reason { get; set; } = "";
    [MaxLength(1000)] public string? Details { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.Open;
    [MaxLength(500)] public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}

public enum NotificationType
{
    InterestReceived = 0,
    InterestAccepted = 1,
    PhotoRequested = 2,
    PhotoRequestApproved = 3,
    VerificationApproved = 4,
    VerificationRejected = 5,
    Shortlisted = 6,
    PlanActivated = 7,
    PlanExpiring = 8,
    PlanExpired = 9,
    StoryApproved = 10,
}

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public NotificationType Type { get; set; }
    /// <summary>The member who caused it, if any.</summary>
    public int? ActorId { get; set; }
    [MaxLength(300)] public string Text { get; set; } = "";
    /// <summary>App route to open, e.g. /profile/5</summary>
    [MaxLength(200)] public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SavedSearch
{
    public int Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(60)] public string Name { get; set; } = "";
    /// <summary>The search filters as JSON (SearchQuery).</summary>
    [MaxLength(2000)] public string QueryJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class VerificationRequest
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    [MaxLength(40)] public string DocumentType { get; set; } = "";
    /// <summary>File name inside the private (not web-served) verification folder.</summary>
    [MaxLength(200)] public string FileName { get; set; } = "";
    [MaxLength(100)] public string ContentType { get; set; } = "";
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    [MaxLength(500)] public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}

public enum OrderStatus { Created = 0, Paid = 1, Failed = 2 }

/// <summary>One purchase attempt of a paid plan.</summary>
public class PaymentOrder
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    [MaxLength(20)] public string PlanCode { get; set; } = "";
    /// <summary>Amount in the smallest currency unit (paise for INR).</summary>
    public int Amount { get; set; }
    [MaxLength(3)] public string Currency { get; set; } = "INR";
    public OrderStatus Status { get; set; } = OrderStatus.Created;
    /// <summary>"Razorpay" or "Demo".</summary>
    [MaxLength(20)] public string Provider { get; set; } = "";
    [MaxLength(64)] public string? ProviderOrderId { get; set; }
    [MaxLength(64)] public string? ProviderPaymentId { get; set; }
    [MaxLength(30)] public string? InvoiceNumber { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}

public class Subscription
{
    public int Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(20)] public string PlanCode { get; set; } = "";
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public int ContactViewsTotal { get; set; }
    public int ContactViewsUsed { get; set; }
    public int? PaymentOrderId { get; set; }
    public bool ReminderSent { get; set; }
    public bool ExpiryNotified { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A paid member unlocked someone's contact details (each profile costs one credit, once).</summary>
public class ContactView
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ViewedUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum TokenPurpose { EmailVerify = 0, PhoneOtp = 1, PasswordReset = 2 }

/// <summary>One-time codes and links. Only a SHA-256 hash of the secret is stored.</summary>
public class SecurityToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public TokenPurpose Purpose { get; set; }
    [MaxLength(64)] public string SecretHash { get; set; } = "";
    /// <summary>The email address or phone number the code was sent to.</summary>
    [MaxLength(256)] public string Target { get; set; } = "";
    public int Attempts { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SuccessStory
{
    public int Id { get; set; }
    public int SubmittedById { get; set; }
    [MaxLength(100)] public string CoupleNames { get; set; } = "";
    [MaxLength(120)] public string Title { get; set; } = "";
    [MaxLength(3000)] public string Story { get; set; } = "";
    public DateTime? WeddingDate { get; set; }
    [MaxLength(60)] public string? City { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}

/// <summary>
/// Emails and SMS that would have been sent while no real provider is configured (development only),
/// so OTPs and links can still be tested. Shown to admins on the Dev outbox tab.
/// </summary>
public class OutboxMessage
{
    public int Id { get; set; }
    [MaxLength(10)] public string Channel { get; set; } = ""; // Email or SMS
    [MaxLength(256)] public string To { get; set; } = "";
    [MaxLength(200)] public string Subject { get; set; } = "";
    [MaxLength(4000)] public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ProfileView
{
    public int Id { get; set; }
    public int ViewerId { get; set; }
    public int ViewedUserId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}
