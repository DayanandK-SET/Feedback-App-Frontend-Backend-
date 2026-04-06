using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models.DTOs;
using Feedback_Generation_App.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace Feedback_Generation_App.Controllers
{
    [Route("api/private-survey")]
    [ApiController]
    public class PrivateSurveyController : ControllerBase
    {
        private readonly IPrivateSurveyService _service;
        private readonly IRepository<int, SurveyParticipant> _participantRepository;
        private readonly IRepository<int, Survey> _surveyRepository;
        private readonly IRepository<int, Response> _responseRepository;

        public PrivateSurveyController(
            IPrivateSurveyService service,
            IRepository<int, SurveyParticipant> participantRepository,
            IRepository<int, Survey> surveyRepository,
            IRepository<int, Response> responseRepository)
        {
            _service = service;
            _participantRepository = participantRepository;
            _surveyRepository = surveyRepository;
            _responseRepository = responseRepository;
        }

        /// POST /api/private-survey/{id}/participants
        [HttpPost("{id}/participants")]
        [Authorize(Roles = "Creator,Admin")]
        public async Task<IActionResult> AddParticipants(int id, [FromBody] AddParticipantsDto dto)
        {
            var creatorId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _service.AddParticipantsAsync(id, creatorId, dto);
            return Ok(new { Message = "Participants added successfully" });
        }

        /// POST /api/private-survey/send-otp
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpDto dto)
        {
            await _service.SendOtpAsync(dto);
            return Ok(new { Message = "OTP sent to your email" });
        }

        /// POST /api/private-survey/verify-otp
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            await _service.VerifyOtpAsync(dto);
            return Ok(new { Message = "OTP verified successfully. You may now access the survey." });
        }

        /// GET /api/private-survey/{id}?email=user@example.com
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPrivateSurvey(int id, [FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { Message = "Email is required" });

            var survey = await _service.GetPrivateSurveyAsync(id, email);
            return Ok(survey);
        }

        /// POST /api/private-survey/{id}/submit?email=user@example.com
        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitPrivateSurvey(
            int id,
            [FromQuery] string email,
            [FromBody] SubmitSurveyDto dto)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { Message = "Email is required" });

            // Verify participant is verified
            var participant = await _participantRepository.GetQueryable()
                .FirstOrDefaultAsync(p => p.SurveyId == id && p.Email == email && !p.IsDeleted);

            if (participant == null)
                return StatusCode(403, new { Message = "You are not invited to this survey" });

            if (!participant.IsVerified)
                return StatusCode(403, new { Message = "OTP verification required" });

            if (participant.IsCompleted)
                return BadRequest(new { Message = "You have already submitted this survey" });

            var survey = await _surveyRepository.GetQueryable()
                .Include(s => s.Questions)
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive && !s.IsDeleted);

            if (survey == null)
                return NotFound(new { Message = "Survey not found or inactive" });

            if (survey.ExpireAt.HasValue && survey.ExpireAt.Value < DateTime.UtcNow)
                return BadRequest(new { Message = "This survey has expired" });

            // Build and save response
            var response = new Response
            {
                SurveyId = survey.Id,
                ResponseToken = dto.ResponseToken ?? email,
                Answers = new List<Answer>()
            };

            foreach (var ans in dto.Answers)
            {
                var question = survey.Questions!.FirstOrDefault(q => q.Id == ans.QuestionId);
                if (question == null)
                    return BadRequest(new { Message = $"Invalid question id: {ans.QuestionId}" });

                var answer = new Answer { QuestionId = ans.QuestionId };
                if (!string.IsNullOrEmpty(ans.TextAnswer))
                    answer.AnswerText = ans.TextAnswer;
                else if (ans.RatingValue.HasValue)
                    answer.AnswerText = ans.RatingValue.Value.ToString();
                else if (ans.SelectedOptionId.HasValue)
                    answer.SelectedOptionId = ans.SelectedOptionId.Value;

                response.Answers!.Add(answer);
            }

            await _responseRepository.AddAsync(response);

            // Mark participant as completed
            participant.IsCompleted = true;
            await _participantRepository.UpdateAsync(participant.Id, participant);

            return Ok(new { Message = "Survey submitted successfully" });
        }
    }
}
