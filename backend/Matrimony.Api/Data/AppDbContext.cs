using Matrimony.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Matrimony.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Interest> Interests => Set<Interest>();
    public DbSet<Shortlist> Shortlists => Set<Shortlist>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<ProfileView> ProfileViews => Set<ProfileView>();
    public DbSet<ProfilePhoto> ProfilePhotos => Set<ProfilePhoto>();
    public DbSet<PhotoRequest> PhotoRequests => Set<PhotoRequest>();
    public DbSet<Block> Blocks => Set<Block>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SavedSearch> SavedSearches => Set<SavedSearch>();
    public DbSet<VerificationRequest> VerificationRequests => Set<VerificationRequest>();
    public DbSet<PaymentOrder> PaymentOrders => Set<PaymentOrder>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<ContactView> ContactViews => Set<ContactView>();
    public DbSet<SecurityToken> SecurityTokens => Set<SecurityToken>();
    public DbSet<SuccessStory> SuccessStories => Set<SuccessStory>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Timestamps are stored in UTC. SQL Server's datetime2 drops the "UTC" flag, so mark values as UTC
        // when reading them back; otherwise the browser shows them as local time and they look hours off.
        // DateOfBirth is a calendar date, not a moment in time, so it is left alone.
        var utc = new ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullable = new ValueConverter<DateTime?, DateTime?>(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
        foreach (var entity in b.Model.GetEntityTypes())
            foreach (var prop in entity.GetProperties().Where(p => p.Name != nameof(Profile.DateOfBirth)))
            {
                if (prop.ClrType == typeof(DateTime)) prop.SetValueConverter(utc);
                else if (prop.ClrType == typeof(DateTime?)) prop.SetValueConverter(utcNullable);
            }

        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.HasOne(u => u.Profile).WithOne(p => p.User)
             .HasForeignKey<Profile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Profile>(e =>
        {
            e.HasIndex(p => p.UserId).IsUnique();
            e.HasIndex(p => new { p.Gender, p.Religion, p.City });
        });

        b.Entity<Interest>(e =>
        {
            e.HasIndex(i => new { i.SenderId, i.ReceiverId }).IsUnique();
            e.HasOne(i => i.Sender).WithMany().HasForeignKey(i => i.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(i => i.Receiver).WithMany().HasForeignKey(i => i.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Shortlist>(e =>
        {
            e.HasIndex(s => new { s.UserId, s.ShortlistedUserId }).IsUnique();
            e.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.ShortlistedUser).WithMany().HasForeignKey(s => s.ShortlistedUserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Message>(e =>
        {
            e.HasIndex(m => new { m.SenderId, m.ReceiverId, m.SentAt });
            e.HasOne<User>().WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(m => m.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ProfilePhoto>(e =>
        {
            e.HasIndex(p => p.UserId);
            e.HasOne<User>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<PhotoRequest>(e =>
        {
            e.HasIndex(r => new { r.RequesterId, r.OwnerId }).IsUnique();
            e.HasOne(r => r.Requester).WithMany().HasForeignKey(r => r.RequesterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(r => r.OwnerId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Block>(e =>
        {
            e.HasIndex(x => new { x.BlockerId, x.BlockedId }).IsUnique();
            e.HasOne<User>().WithMany().HasForeignKey(x => x.BlockerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Blocked).WithMany().HasForeignKey(x => x.BlockedId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Report>(e =>
        {
            e.HasIndex(r => r.Status);
            e.HasOne(r => r.Reporter).WithMany().HasForeignKey(r => r.ReporterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.Reported).WithMany().HasForeignKey(r => r.ReportedId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Notification>(e =>
        {
            e.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });
            e.HasOne<User>().WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<SavedSearch>(e =>
        {
            e.HasIndex(s => s.UserId);
            e.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<VerificationRequest>(e =>
        {
            e.HasIndex(v => new { v.Status, v.CreatedAt });
            e.HasIndex(v => v.UserId);
            e.HasOne(v => v.User).WithMany().HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<PaymentOrder>(e =>
        {
            e.HasIndex(o => o.UserId);
            e.HasIndex(o => o.ProviderOrderId);
            e.HasIndex(o => o.InvoiceNumber).IsUnique().HasFilter("[InvoiceNumber] IS NOT NULL");
            e.HasOne(o => o.User).WithMany().HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Subscription>(e =>
        {
            e.HasIndex(s => new { s.UserId, s.EndsAt });
            e.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<PaymentOrder>().WithMany().HasForeignKey(s => s.PaymentOrderId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ContactView>(e =>
        {
            e.HasIndex(c => new { c.UserId, c.ViewedUserId }).IsUnique();
            e.HasOne<User>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<User>().WithMany().HasForeignKey(c => c.ViewedUserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<SecurityToken>(e =>
        {
            e.HasIndex(t => new { t.UserId, t.Purpose });
            e.HasIndex(t => t.SecretHash);
            e.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<SuccessStory>(e =>
        {
            e.HasIndex(s => new { s.Status, s.CreatedAt });
            e.HasOne<User>().WithMany().HasForeignKey(s => s.SubmittedById).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ProfileView>(e =>
        {
            e.HasIndex(v => new { v.ViewedUserId, v.ViewedAt });
            e.HasOne<User>().WithMany().HasForeignKey(v => v.ViewerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(v => v.ViewedUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
