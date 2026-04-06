namespace Feedback_Generation_App.Models.DTOs
{
    public class CreateSurveyDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public List<CreateQuestionDto> Questions { get; set; } = new();

        public DateTime? ExpireAt { get; set; }
        public int? MaxResponses { get; set; }

        public bool IsPrivate { get; set; } = false;

        /// <summary>Required when IsPrivate = true. List of participant emails to invite.</summary>
        public List<string>? ParticipantEmails { get; set; }

        /// <summary>
        /// HTML invitation email body built by the frontend.
        /// Sent to each participant when the private survey is created.
        /// </summary>
        public string? InvitationHtmlBody { get; set; }
    }
}
