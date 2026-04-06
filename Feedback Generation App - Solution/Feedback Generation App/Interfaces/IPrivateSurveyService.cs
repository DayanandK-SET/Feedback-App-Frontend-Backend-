using Feedback_Generation_App.Models.DTOs;

namespace Feedback_Generation_App.Interfaces
{
    public interface IPrivateSurveyService
    {
        /// <summary>Add participant emails to a private survey (Creator only).</summary>
        Task AddParticipantsAsync(int surveyId, int creatorId, AddParticipantsDto dto);

        /// <summary>Generate and email a 6-digit OTP to the participant.</summary>
        Task SendOtpAsync(SendOtpDto dto);

        /// <summary>Validate OTP and mark participant as verified.</summary>
        Task VerifyOtpAsync(VerifyOtpDto dto);

        /// <summary>Return survey details only if the participant is verified.</summary>
        Task<PublicSurveyDto> GetPrivateSurveyAsync(int surveyId, string email);
    }
}
