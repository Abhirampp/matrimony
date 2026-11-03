# Vivaha Matrimony

A matrimony web application built with **Angular 20**, **ASP.NET Core (.NET 10) Web API** and **SQL Server**.

## Features

**Accounts & security**
- Register / login (JWT auth, BCrypt-hashed passwords, minimum age check: 18 for women, 21 for men)
- **Email confirmation** link (sent on registration, can be re-sent), **phone OTP** verification (6-digit SMS code)
- **Forgot password / reset password** by email link (30 minutes, single use), change password
- Login, registration and code/link endpoints are **rate-limited** (20 requests a minute per IP by default)
- One-time codes and links are stored only as SHA-256 hashes, expire, and allow 5 wrong tries

**Profiles**
- Detailed profile: who manages it (self / parent / sibling…), religion & community, education & career,
  location & residency (NRI), **family**, **lifestyle**, **horoscope** (rasi, nakshatra, manglik, birth time & place), about me
- **Photo album** (up to 6) and **photo privacy**: everyone, or only connections and people you approve (photo requests)
- **Profile completeness** meter, **ID verification** (admin-reviewed ✔ Verified badge), **★ Premium** badge for paid members

**Finding a match**
- **Matches** from partner preferences, ranked by **match %** (how well you fit each other's preferences)
- **Horoscope compatibility**: simplified Ashtakoot score out of 24 (Tara, Gana, Bhakoot, Nadi) with a manglik note
- **Search** with 13 filters and up to 10 **saved searches**; **recently joined**; **who shortlisted me**; **who viewed me**

**Connecting**
- **Interests** (send, accept, decline, withdraw); contact details and birth details hidden until accepted
- **Live chat** (SignalR) after an accepted interest, with ✓ sent / ✓✓ read ticks
- **Notifications**: 🔔 bell, live pop-ups and a notifications page
- **Block**, **report**, **hide profile**

**Paid plans** (prices are examples – change them in `Services/Plans.cs`)

| | Free | Gold – ₹2,999 / 3 months | Platinum – ₹5,999 / 6 months |
|---|---|---|---|
| Interests a day | 10 | 50 | Unlimited |
| View contact details without an accepted interest | – | 50 profiles | 150 profiles |
| See who viewed your profile | Count only | ✔ | ✔ |
| ★ Premium badge | – | ✔ | ✔ |
| Profile boost (shown first in search & matches) | – | – | ✔ |

- Checkout with **Razorpay** (or a clearly-labelled **demo checkout** for local testing), **invoices** (printable / save as PDF),
  billing history, email receipt
- Buying the same plan again extends it; switching plans starts the new one today; unused contact views carry over
- Automatic **reminder** 3 days before a plan ends and a notice when it has ended (hourly background job)

**Success stories**: couples share their story; it appears on the public page and home page after an admin approves it.

**Admin**
- Stats incl. revenue and active Gold / Platinum members
- Members: verify, block / unblock, **give a free plan** (recorded as a ₹0 "complimentary" order)
- Queues: **reports**, **ID verification** (document preview), **success stories**
- **Payments** list with invoices
- **Dev outbox** (Development only): emails and SMS that would have been sent while no provider is set up

## Project layout

```
Matrimony/
├── backend/Matrimony.Api/     ASP.NET Core Web API
│   ├── Controllers/           Auth, Account, Profiles, Interests, Shortlist, Messages, Notifications,
│   │                          SavedSearches, Safety, Verification, Payments, Stories, Admin
│   ├── Models/Entities.cs     All database tables
│   ├── Data/                  AppDbContext (EF Core), Migrations/, demo seed data
│   ├── Dtos/                  Request/response models
│   ├── Services/              Matching (horoscope, match %, privacy), Realtime (SignalR), Plans,
│   │                          Payments (Razorpay), Messaging (SMTP email, Twilio SMS), PlanReminderService
│   ├── wwwroot/uploads/       Uploaded photos (served publicly by random file name)
│   └── App_Data/verification/ ID documents – private, never served, deleted after review
├── frontend/                  Angular 20 app (standalone components, signals)
│   └── src/app/
│       ├── core/              API, auth, realtime and checkout services, JWT interceptor, route guards
│       ├── shared/            Profile card, dropdown options
│       └── pages/             home, auth & account pages, dashboard, search, profile, my-profile, interests,
│                              shortlist, messages, notifications, plans, billing/invoice, stories, admin
└── database/schema.sql        SQL Server schema script (optional; see below)
```

## Requirements

- .NET SDK 10
- Node.js 20+ (tested with 24)
- SQL Server (Express, Developer or LocalDB)

## 1. Database

The API uses **EF Core migrations**. On startup it creates the `MatrimonyDb` database if needed,
applies any new migrations (so existing data is kept when you upgrade), and adds demo data.

The connection string is in `backend/Matrimony.Api/appsettings.json`:

```json
"Default": "Server=localhost\\SQLEXPRESS;Database=MatrimonyDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

Change `Server=` if you use something else, e.g. `(localdb)\\MSSQLLocalDB` or `localhost`.

Prefer to create the database yourself? Run `database/schema.sql` in SSMS. It is generated from the migrations and is safe to run more than once.
(If you run scripts with `sqlcmd`, add `-I`; some tables have filtered indexes that need `QUOTED_IDENTIFIER ON`.)

**Changing the database schema** (after editing `Models/Entities.cs`):

```bash
cd backend/Matrimony.Api
dotnet tool restore
dotnet ef migrations add <DescribeTheChange> -o Data/Migrations
dotnet ef migrations script --idempotent -o ../../database/schema.sql
```

The next API start applies the new migration. (The second command refreshes `schema.sql`; re-add its 6-line header if you want the `CREATE DATABASE` part.)

## 2. Run the API

```bash
cd backend/Matrimony.Api
dotnet run --launch-profile http
```

The API runs on http://localhost:5165. In Development, the OpenAPI document is at http://localhost:5165/openapi/v1.json.

## 3. Run the Angular app

```bash
cd frontend
npm install
npm start
```

Open http://localhost:4200.

## 4. Payments, email and SMS (optional)

Everything works locally without any accounts:
- **Payments** use a **demo checkout** (Development only, `Payments:Provider = "Demo"` in `appsettings.Development.json`). No money moves.
- **Emails and SMS** go to the admin **Dev outbox** tab (Development only), so you can copy OTP codes and links from there.

To use real services, put the keys in **user secrets** (never in `appsettings.json`), for example:

```bash
cd backend/Matrimony.Api
dotnet user-secrets init
dotnet user-secrets set "Payments:Razorpay:KeyId" "rzp_test_xxxxxxxx"
dotnet user-secrets set "Payments:Razorpay:KeySecret" "xxxxxxxxxxxxxxxx"
```

| Setting | What it does |
|---|---|
| `Payments:Razorpay:KeyId`, `KeySecret` | Turns on Razorpay Checkout (use **test** keys `rzp_test_…` first). Overrides demo mode. |
| `Payments:Razorpay:WebhookSecret` | Optional. In the Razorpay dashboard add a webhook for **order.paid** pointing at `https://<your-api>/api/payments/razorpay-webhook`; plans then activate even if the member closes the browser mid-payment. |
| `Email:Smtp:Host`, `Port`, `User`, `Password`, `Email:From` | Any SMTP service (SendGrid, Amazon SES, Zoho, Gmail app password…). |
| `Sms:Twilio:AccountSid`, `AuthToken`, `From` | Twilio SMS for OTPs. (For an Indian SMS provider such as MSG91, add a sender in `Services/Messaging.cs`.) |
| `App:FrontendUrl` | Used in email links (verify email, reset password). |
| `Billing:SellerName`, `SellerAddress`, `InvoicePrefix` | Shown on invoices. Add your GSTIN to the address if you charge GST. |
| `RateLimit:AuthPerMinute` | Requests per minute per IP on login / register / code endpoints (default 20). |

Razorpay test cards and UPI IDs are listed in Razorpay's docs ("Test card details").

## Demo accounts

All demo accounts use the password **`Password@123`**.

| Role   | Email                                                   |
|--------|---------------------------------------------------------|
| Admin  | admin@matrimony.local                                   |
| Male   | arjun@demo.local, rahul@demo.local, vikram@demo.local … |
| Female | ananya@demo.local, priya@demo.local, divya@demo.local … |

The demo emails are the first names of the seeded members (see `Data/SeedData.cs`).

## API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account (sends confirmation email) / sign in – returns JWT |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password` | Email a reset link / set new password with its token |
| POST | `/api/auth/verify-email` | Confirm email with the token from the link |
| GET | `/api/account` | Email / phone and whether they're verified |
| POST | `/api/account/email/send` | Re-send the confirmation email |
| POST | `/api/account/phone/send-otp`, `/api/account/phone/verify` | Send an SMS code / check it |
| GET/PUT | `/api/profiles/me` | Read / update own profile |
| PUT | `/api/profiles/me/privacy` | Photo visibility, hide profile |
| POST/DELETE | `/api/profiles/me/photos[/{id}]`, `…/{id}/primary` | Photo album |
| GET | `/api/profiles/{userId}` | View a profile (records a view) |
| POST | `/api/profiles/{userId}/contact` | Reveal contact details (free if connected, else uses a plan credit; 402 if none) |
| GET | `/api/profiles/search?...`, `/matches`, `/recent` | Search, matches, recently joined |
| GET | `/api/profiles/dashboard`, `/visitors` | Counters; who viewed me (list for paid plans, count for Free) |
| POST | `/api/interests/{userId}` | Send interest (429 when the daily limit is reached) |
| GET | `/api/interests/received`, `/sent` | List interests |
| POST/DELETE | `/api/interests/{id}/respond`, `/api/interests/{id}` | Accept / decline, withdraw |
| GET/POST/DELETE | `/api/shortlist[/{userId}]`, `/api/shortlist/by-others` | Shortlist, who shortlisted me |
| GET/POST | `/api/messages/conversations`, `/api/messages/{userId}` | Chat |
| POST/GET | `/api/photo-requests/{userId}`, `/received`, `/{id}/respond` | Photo requests |
| GET/POST/DELETE | `/api/blocks[/{userId}]`, POST `/api/reports/{userId}` | Block, report |
| GET/POST | `/api/notifications`, `/badges`, `/{id}/read`, `/read-all` | Notifications |
| GET/POST/DELETE | `/api/saved-searches[/{id}]` | Saved searches |
| GET/POST | `/api/verification[/me]` | ID verification |
| GET | `/api/plans` (public), `/api/plans/me` | Plans and payment mode; my plan and usage |
| POST | `/api/payments/orders`, `/api/payments/verify`, `/api/payments/orders/{id}/cancel` | Checkout |
| GET | `/api/payments/orders`, `/api/payments/orders/{id}/invoice` | Billing history, invoice |
| POST | `/api/payments/razorpay-webhook` | Razorpay webhook (signature-checked) |
| GET/POST | `/api/stories` (public), `/api/stories/mine` | Success stories |
| WS | `/hubs/app?access_token=…` | SignalR: `message`, `notification`, `badges`, `read` |
| GET/POST | `/api/admin/stats`, `/users`, `/users/{id}/toggle-active`, `/toggle-verified`, `/grant-plan` | Admin: members |
| GET/POST | `/api/admin/reports`, `/verifications`, `/stories` (+ `/{id}/…` review actions) | Admin: queues |
| GET | `/api/admin/payments` | Admin: payments |
| GET/DELETE | `/api/admin/outbox` | Admin: Dev outbox (Development only) |

## Before going live

- Replace `Jwt:Key` with a long random secret, and keep all keys in user-secrets / environment variables, not in files.
- Set `Cors:Origins` and `App:FrontendUrl` to your real site, and update `frontend/src/environments/environment.ts`.
- Switch Razorpay from test keys to live keys only after testing the full flow, and set up the **order.paid** webhook.
- Configure a real email (SMTP) and SMS provider; without them, production can't send OTPs or reset links.
- Prices in `Services/Plans.cs` are examples. If you charge GST, add tax lines and your GSTIN to the invoice.
- Logins last 7 days (JWT). Resetting a password doesn't sign out other devices yet; add a token version check if you need that.
- Store photos in blob storage (Azure Blob / S3). Photo files are currently public to anyone who knows their (random)
  URL; the API only hides the URL from people who may not see it.
- ID documents are personal data: on a real server keep them in encrypted, access-controlled storage. They are already
  deleted as soon as an admin reviews them.
- SignalR keeps connections in one server's memory. With more than one API server, add Azure SignalR Service or Redis.
- The rate limiter counts per IP; behind a load balancer or proxy, configure forwarded headers so it sees real client IPs.
- The horoscope score is a simplified guide (4 of the 8 Ashtakoot factors), not a full kundli match.
- Remove or disable the demo seed data (`SeedData.RunAsync` in `Program.cs`).

## Reset the demo database

Drop `MatrimonyDb` in SSMS (or run `DROP DATABASE MatrimonyDb;`) and start the API again. It recreates the tables and demo data.
Uploaded photo files in `backend/Matrimony.Api/wwwroot/uploads` are not removed by this; delete them by hand if you like.
