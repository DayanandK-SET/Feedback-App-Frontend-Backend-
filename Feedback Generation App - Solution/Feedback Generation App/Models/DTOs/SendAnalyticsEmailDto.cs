using System.ComponentModel.DataAnnotations;

namespace Feedback_Generation_App.Models.DTOs
{
    public class SendAnalyticsEmailDto
    {
        /// <summary>Optional override email. If empty, uses the creator's registered email.</summary>
        [EmailAddress]
        public string? Email { get; set; }

        /// <summary>HTML email body built by the frontend. If empty, a plain-text fallback is used.</summary>
        public string? HtmlBody { get; set; }
    }
}
