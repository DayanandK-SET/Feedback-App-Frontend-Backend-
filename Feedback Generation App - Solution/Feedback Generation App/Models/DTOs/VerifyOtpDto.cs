using System.ComponentModel.DataAnnotations;

namespace Feedback_Generation_App.Models.DTOs
{
    public class VerifyOtpDto
    {
        [Required]
        public int SurveyId { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string OTP { get; set; } = string.Empty;
    }
}
