namespace Feedback_Generation_App.Models
{
    public class SurveyParticipant : BaseEntity
    {
        public int SurveyId { get; set; }
        public Survey? Survey { get; set; }

        public string Email { get; set; } = string.Empty;

        public string? OTP { get; set; }
        public DateTime? OTPExpiry { get; set; }

        public bool IsVerified { get; set; } = false;
        public bool IsCompleted { get; set; } = false;
    }
}
