using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using Matrimony.Api.Data;
using Matrimony.Api.Models;

namespace Matrimony.Api.Services;

public enum Delivery { Sent, DevOutbox, NotConfigured, Failed }

/// <summary>
/// Sends email (any SMTP service: SendGrid, Amazon SES, Gmail, Zoho…) and SMS (Twilio).
/// When a provider isn't configured and the app runs in Development, the message is saved to the
/// Dev outbox instead (admin → Dev outbox) so codes and links can still be tested locally.
/// </summary>
public class MessageSender(
    IConfiguration config, IWebHostEnvironment env, AppDbContext db, IHttpClientFactory http, ILogger<MessageSender> log)
{
    public bool EmailConfigured => !string.IsNullOrWhiteSpace(config["Email:Smtp:Host"]);
    public bool SmsConfigured => !string.IsNullOrWhiteSpace(config["Sms:Twilio:AccountSid"]);

    public async Task<Delivery> SendEmailAsync(string to, string subject, string body)
    {
        if (EmailConfigured)
        {
            try
            {
                using var client = new SmtpClient(config["Email:Smtp:Host"], config.GetValue("Email:Smtp:Port", 587))
                {
                    EnableSsl = config.GetValue("Email:Smtp:EnableSsl", true),
                    Credentials = new NetworkCredential(config["Email:Smtp:User"], config["Email:Smtp:Password"]),
                };
                var from = config["Email:From"] ?? config["Email:Smtp:User"]!;
                using var msg = new MailMessage(new MailAddress(from, config["Email:FromName"] ?? "Vivaha Matrimony"), new MailAddress(to))
                {
                    Subject = subject,
                    Body = body,
                };
                await client.SendMailAsync(msg);
                return Delivery.Sent;
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Sending email to {To} failed", to);
                return Delivery.Failed;
            }
        }
        return await ToOutbox("Email", to, subject, body);
    }

    public async Task<Delivery> SendSmsAsync(string to, string text)
    {
        if (SmsConfigured)
        {
            try
            {
                var sid = config["Sms:Twilio:AccountSid"]!;
                var client = http.CreateClient();
                var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{sid}:{config["Sms:Twilio:AuthToken"]}"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);
                var res = await client.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                    new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        ["To"] = to, ["From"] = config["Sms:Twilio:From"] ?? "", ["Body"] = text,
                    }));
                if (res.IsSuccessStatusCode) return Delivery.Sent;
                log.LogError("Twilio returned {Status}: {Body}", res.StatusCode, await res.Content.ReadAsStringAsync());
                return Delivery.Failed;
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Sending SMS to {To} failed", to);
                return Delivery.Failed;
            }
        }
        return await ToOutbox("SMS", to, "", text);
    }

    private async Task<Delivery> ToOutbox(string channel, string to, string subject, string body)
    {
        if (!env.IsDevelopment())
        {
            log.LogWarning("{Channel} provider is not configured; message to {To} was not sent", channel, to);
            return Delivery.NotConfigured;
        }
        db.OutboxMessages.Add(new OutboxMessage { Channel = channel, To = to, Subject = subject, Body = body });
        await db.SaveChangesAsync();
        log.LogInformation("[Dev outbox] {Channel} to {To}: {Subject} {Body}", channel, to, subject, body);
        return Delivery.DevOutbox;
    }
}
