using Feedback_Generation_App.Interfaces;
using System.Net;
using System.Net.Mail;

namespace Feedback_Generation_App.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private SmtpClient BuildSmtpClient()
        {
            var host = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var port = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var username = _configuration["Email:Username"]
                ?? throw new InvalidOperationException("Email:Username not configured");
            var password = _configuration["Email:Password"]
                ?? throw new InvalidOperationException("Email:Password not configured");

            return new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = true
            };
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = false)
        {
            var from = _configuration["Email:Username"]!;
            using var message = new MailMessage(from, toEmail, subject, body)
            {
                IsBodyHtml = isHtml
            };

            using var client = BuildSmtpClient();
            await client.SendMailAsync(message);
        }

        public async Task SendEmailWithAttachmentAsync(
            string toEmail,
            string subject,
            string body,
            byte[] attachment,
            string attachmentFileName,
            bool isHtml = false)
        {
            var from = _configuration["Email:Username"]!;
            using var message = new MailMessage(from, toEmail, subject, body)
            {
                IsBodyHtml = isHtml
            };

            using var stream = new MemoryStream(attachment);
            message.Attachments.Add(new Attachment(stream, attachmentFileName,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

            using var client = BuildSmtpClient();
            await client.SendMailAsync(message);
        }
    }
}
