using System.Net;
using System.Net.Mail;
using CCSUMeerut.Recruitment.Api.Configuration;
using Microsoft.Extensions.Options;

namespace CCSUMeerut.Recruitment.Api.Services;

public class EmailService : IEmailService
{
    private readonly SmtpOptions _smtpOptions;

    public EmailService(IOptions<SmtpOptions> smtpOptions)
    {
        _smtpOptions = smtpOptions.Value;
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        Console.WriteLine($"[DEBUG] Attempting to send email to {to} with subject '{subject}'");
        using var client = new SmtpClient(_smtpOptions.Host, _smtpOptions.Port)
        {
            Credentials = new NetworkCredential(_smtpOptions.Email, _smtpOptions.Password),
            EnableSsl = true,
            Timeout = 30000 // 30 seconds timeout
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(_smtpOptions.Email, _smtpOptions.SenderName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };

        mailMessage.To.Add(to);

        try
        {
            await client.SendMailAsync(mailMessage);
            Console.WriteLine($"[DEBUG] Email sent successfully to {to}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Failed to send email to {to}: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[INNER ERROR] {ex.InnerException.Message}");
            }
            throw;
        }
    }
}
