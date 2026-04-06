using System.ComponentModel.DataAnnotations;

namespace Feedback_Generation_App.Models.DTOs
{
    public class AddParticipantsDto
    {
        [Required]
        public List<string> Emails { get; set; } = new();

        /// <summary>
        /// HTML invitation email body built by the frontend.
        /// Sent to each new participant when they are added.
        /// </summary>
        public string? InvitationHtmlBody { get; set; }
    }
}
