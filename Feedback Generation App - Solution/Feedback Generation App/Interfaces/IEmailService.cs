namespace Feedback_Generation_App.Interfaces
{
    public interface IEmailService
    {
        /// <summary>Sends a plain-text or HTML email.</summary>
        Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = false);

        /// <summary>Sends an email with a byte-array attachment.</summary>
        Task SendEmailWithAttachmentAsync(
            string toEmail,
            string subject,
            string body,
            byte[] attachment,
            string attachmentFileName,
            bool isHtml = false);
    }
}
