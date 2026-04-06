using Microsoft.AspNetCore.Http;

namespace Feedback_Generation_App.Models.DTOs
{
    public class ImportSurveyExcelDto
    {
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public IFormFile File { get; set; } = null!;

        public DateTime? ExpireAt { get; set; }

        public int? MaxResponses { get; set; }

        // ── Private survey support ────────────────────────────────

        public bool IsPrivate { get; set; } = false;

        /// <summary>Comma-separated participant emails (sent as a form field).</summary>
        public string? ParticipantEmailsCsv { get; set; }

        /// <summary>HTML invitation email body built by the frontend.</summary>
        public string? InvitationHtmlBody { get; set; }
    }
}
