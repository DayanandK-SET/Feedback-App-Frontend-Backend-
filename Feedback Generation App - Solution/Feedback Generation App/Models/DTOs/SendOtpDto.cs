using System.ComponentModel.DataAnnotations;

namespace Feedback_Generation_App.Models.DTOs
{
    public class SendOtpDto
    {
        [Required]
        public int SurveyId { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
