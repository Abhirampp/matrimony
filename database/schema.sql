-- Matrimony database schema (SQL Server), generated from EF Core migrations.
-- The API applies migrations automatically on startup. Use this script only to set up the DB by hand.
-- It is safe to run more than once.
IF DB_ID('MatrimonyDb') IS NULL CREATE DATABASE MatrimonyDb;
GO
USE MatrimonyDb;
GO

IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [Email] nvarchar(256) NOT NULL,
        [Phone] nvarchar(20) NULL,
        [PasswordHash] nvarchar(max) NOT NULL,
        [Role] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastLoginAt] datetime2 NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE TABLE [Interests] (
        [Id] int NOT NULL IDENTITY,
        [SenderId] int NOT NULL,
        [ReceiverId] int NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [RespondedAt] datetime2 NULL,
        CONSTRAINT [PK_Interests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Interests_Users_ReceiverId] FOREIGN KEY ([ReceiverId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Interests_Users_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE TABLE [Messages] (
        [Id] int NOT NULL IDENTITY,
        [SenderId] int NOT NULL,
        [ReceiverId] int NOT NULL,
        [Content] nvarchar(2000) NOT NULL,
        [SentAt] datetime2 NOT NULL,
        [IsRead] bit NOT NULL,
        CONSTRAINT [PK_Messages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Messages_Users_ReceiverId] FOREIGN KEY ([ReceiverId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Messages_Users_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE TABLE [Profiles] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [FullName] nvarchar(100) NOT NULL,
        [Gender] int NOT NULL,
        [DateOfBirth] datetime2 NOT NULL,
        [MaritalStatus] nvarchar(30) NOT NULL,
        [HeightCm] int NULL,
        [MotherTongue] nvarchar(50) NULL,
        [Religion] nvarchar(50) NULL,
        [Caste] nvarchar(50) NULL,
        [Education] nvarchar(100) NULL,
        [Occupation] nvarchar(100) NULL,
        [AnnualIncome] nvarchar(50) NULL,
        [City] nvarchar(60) NULL,
        [State] nvarchar(60) NULL,
        [Country] nvarchar(60) NULL,
        [FamilyType] nvarchar(30) NULL,
        [About] nvarchar(2000) NULL,
        [PhotoUrl] nvarchar(300) NULL,
        [PrefAgeMin] int NULL,
        [PrefAgeMax] int NULL,
        [PrefHeightMin] int NULL,
        [PrefReligion] nvarchar(50) NULL,
        [PrefMotherTongue] nvarchar(50) NULL,
        [PrefMaritalStatus] nvarchar(30) NULL,
        [IsVerified] bit NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Profiles] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Profiles_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE TABLE [ProfileViews] (
        [Id] int NOT NULL IDENTITY,
        [ViewerId] int NOT NULL,
        [ViewedUserId] int NOT NULL,
        [ViewedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ProfileViews] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProfileViews_Users_ViewedUserId] FOREIGN KEY ([ViewedUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ProfileViews_Users_ViewerId] FOREIGN KEY ([ViewerId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE TABLE [Shortlists] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [ShortlistedUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Shortlists] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Shortlists_Users_ShortlistedUserId] FOREIGN KEY ([ShortlistedUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Shortlists_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Interests_ReceiverId] ON [Interests] ([ReceiverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Interests_SenderId_ReceiverId] ON [Interests] ([SenderId], [ReceiverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Messages_ReceiverId] ON [Messages] ([ReceiverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Messages_SenderId_ReceiverId_SentAt] ON [Messages] ([SenderId], [ReceiverId], [SentAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Profiles_Gender_Religion_City] ON [Profiles] ([Gender], [Religion], [City]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Profiles_UserId] ON [Profiles] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProfileViews_ViewedUserId_ViewedAt] ON [ProfileViews] ([ViewedUserId], [ViewedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProfileViews_ViewerId] ON [ProfileViews] ([ViewerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Shortlists_ShortlistedUserId] ON [Shortlists] ([ShortlistedUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Shortlists_UserId_ShortlistedUserId] ON [Shortlists] ([UserId], [ShortlistedUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170408_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103170408_InitialCreate', N'10.0.14');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [BirthPlace] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [BirthTime] nvarchar(10) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Brothers] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [CreatedBy] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Diet] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Drinking] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [FamilyValues] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [FatherOccupation] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [IsHidden] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Manglik] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [MotherOccupation] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Nakshatra] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [PhotoVisibility] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Rasi] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [ResidencyStatus] nvarchar(40) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Sisters] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    ALTER TABLE [Profiles] ADD [Smoking] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE TABLE [Blocks] (
        [Id] int NOT NULL IDENTITY,
        [BlockerId] int NOT NULL,
        [BlockedId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Blocks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Blocks_Users_BlockedId] FOREIGN KEY ([BlockedId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Blocks_Users_BlockerId] FOREIGN KEY ([BlockerId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE TABLE [PhotoRequests] (
        [Id] int NOT NULL IDENTITY,
        [RequesterId] int NOT NULL,
        [OwnerId] int NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PhotoRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PhotoRequests_Users_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PhotoRequests_Users_RequesterId] FOREIGN KEY ([RequesterId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE TABLE [ProfilePhotos] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Url] nvarchar(300) NOT NULL,
        [IsPrimary] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ProfilePhotos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProfilePhotos_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE TABLE [Reports] (
        [Id] int NOT NULL IDENTITY,
        [ReporterId] int NOT NULL,
        [ReportedId] int NOT NULL,
        [Reason] nvarchar(50) NOT NULL,
        [Details] nvarchar(1000) NULL,
        [Status] int NOT NULL,
        [AdminNote] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ResolvedAt] datetime2 NULL,
        CONSTRAINT [PK_Reports] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Reports_Users_ReportedId] FOREIGN KEY ([ReportedId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Reports_Users_ReporterId] FOREIGN KEY ([ReporterId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE INDEX [IX_Blocks_BlockedId] ON [Blocks] ([BlockedId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Blocks_BlockerId_BlockedId] ON [Blocks] ([BlockerId], [BlockedId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE INDEX [IX_PhotoRequests_OwnerId] ON [PhotoRequests] ([OwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PhotoRequests_RequesterId_OwnerId] ON [PhotoRequests] ([RequesterId], [OwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE INDEX [IX_ProfilePhotos_UserId] ON [ProfilePhotos] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE INDEX [IX_Reports_ReportedId] ON [Reports] ([ReportedId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE INDEX [IX_Reports_ReporterId] ON [Reports] ([ReporterId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    CREATE INDEX [IX_Reports_Status] ON [Reports] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103170824_Phase1ProfilesPrivacySafety'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103170824_Phase1ProfilesPrivacySafety', N'10.0.14');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    CREATE TABLE [Notifications] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Type] int NOT NULL,
        [ActorId] int NULL,
        [Text] nvarchar(300) NOT NULL,
        [Link] nvarchar(200) NULL,
        [IsRead] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Notifications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    CREATE TABLE [SavedSearches] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Name] nvarchar(60) NOT NULL,
        [QueryJson] nvarchar(2000) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SavedSearches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SavedSearches_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    CREATE TABLE [VerificationRequests] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [DocumentType] nvarchar(40) NOT NULL,
        [FileName] nvarchar(200) NOT NULL,
        [ContentType] nvarchar(100) NOT NULL,
        [Status] int NOT NULL,
        [AdminNote] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReviewedAt] datetime2 NULL,
        CONSTRAINT [PK_VerificationRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VerificationRequests_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    CREATE INDEX [IX_Notifications_UserId_IsRead_CreatedAt] ON [Notifications] ([UserId], [IsRead], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    CREATE INDEX [IX_SavedSearches_UserId] ON [SavedSearches] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    CREATE INDEX [IX_VerificationRequests_Status_CreatedAt] ON [VerificationRequests] ([Status], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    CREATE INDEX [IX_VerificationRequests_UserId] ON [VerificationRequests] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103172021_Phase2NotificationsSearchVerification'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103172021_Phase2NotificationsSearchVerification', N'10.0.14');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    ALTER TABLE [Users] ADD [EmailVerified] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    ALTER TABLE [Users] ADD [PhoneVerified] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    ALTER TABLE [Profiles] ADD [PremiumPlan] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    ALTER TABLE [Profiles] ADD [PremiumUntil] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE TABLE [ContactViews] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [ViewedUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ContactViews] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContactViews_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ContactViews_Users_ViewedUserId] FOREIGN KEY ([ViewedUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE TABLE [OutboxMessages] (
        [Id] int NOT NULL IDENTITY,
        [Channel] nvarchar(10) NOT NULL,
        [To] nvarchar(256) NOT NULL,
        [Subject] nvarchar(200) NOT NULL,
        [Body] nvarchar(4000) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_OutboxMessages] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE TABLE [PaymentOrders] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [PlanCode] nvarchar(20) NOT NULL,
        [Amount] int NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [Status] int NOT NULL,
        [Provider] nvarchar(20) NOT NULL,
        [ProviderOrderId] nvarchar(64) NULL,
        [ProviderPaymentId] nvarchar(64) NULL,
        [InvoiceNumber] nvarchar(30) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [PaidAt] datetime2 NULL,
        CONSTRAINT [PK_PaymentOrders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaymentOrders_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE TABLE [SecurityTokens] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Purpose] int NOT NULL,
        [SecretHash] nvarchar(64) NOT NULL,
        [Target] nvarchar(256) NOT NULL,
        [Attempts] int NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [UsedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SecurityTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SecurityTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE TABLE [SuccessStories] (
        [Id] int NOT NULL IDENTITY,
        [SubmittedById] int NOT NULL,
        [CoupleNames] nvarchar(100) NOT NULL,
        [Title] nvarchar(120) NOT NULL,
        [Story] nvarchar(3000) NOT NULL,
        [WeddingDate] datetime2 NULL,
        [City] nvarchar(60) NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReviewedAt] datetime2 NULL,
        CONSTRAINT [PK_SuccessStories] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SuccessStories_Users_SubmittedById] FOREIGN KEY ([SubmittedById]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE TABLE [Subscriptions] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [PlanCode] nvarchar(20) NOT NULL,
        [StartsAt] datetime2 NOT NULL,
        [EndsAt] datetime2 NOT NULL,
        [ContactViewsTotal] int NOT NULL,
        [ContactViewsUsed] int NOT NULL,
        [PaymentOrderId] int NULL,
        [ReminderSent] bit NOT NULL,
        [ExpiryNotified] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Subscriptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Subscriptions_PaymentOrders_PaymentOrderId] FOREIGN KEY ([PaymentOrderId]) REFERENCES [PaymentOrders] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Subscriptions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ContactViews_UserId_ViewedUserId] ON [ContactViews] ([UserId], [ViewedUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_ContactViews_ViewedUserId] ON [ContactViews] ([ViewedUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_PaymentOrders_InvoiceNumber] ON [PaymentOrders] ([InvoiceNumber]) WHERE [InvoiceNumber] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_PaymentOrders_ProviderOrderId] ON [PaymentOrders] ([ProviderOrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_PaymentOrders_UserId] ON [PaymentOrders] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_SecurityTokens_SecretHash] ON [SecurityTokens] ([SecretHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_SecurityTokens_UserId_Purpose] ON [SecurityTokens] ([UserId], [Purpose]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_Subscriptions_PaymentOrderId] ON [Subscriptions] ([PaymentOrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_Subscriptions_UserId_EndsAt] ON [Subscriptions] ([UserId], [EndsAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_SuccessStories_Status_CreatedAt] ON [SuccessStories] ([Status], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    CREATE INDEX [IX_SuccessStories_SubmittedById] ON [SuccessStories] ([SubmittedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103174018_Phase3PlansPaymentsAccountStories'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103174018_Phase3PlansPaymentsAccountStories', N'10.0.14');
END;

COMMIT;
GO


