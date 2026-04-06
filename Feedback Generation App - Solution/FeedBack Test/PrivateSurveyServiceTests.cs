using Feedback_Generation_App.Contexts;
using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Feedback_Generation_App.Repositories;
using Feedback_Generation_App.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace FeedbackBack_Unit_Tests
{
    /// <summary>
    /// Tests for PrivateSurveyService:
    /// AddParticipantsAsync, SendOtpAsync, VerifyOtpAsync, GetPrivateSurveyAsync
    /// </summary>
    public class PrivateSurveyServiceTests
    {
        private readonly FeedbackContext _context;
        private readonly IRepository<int, Survey> _surveyRepository;
        private readonly IRepository<int, SurveyParticipant> _participantRepository;
        private readonly Mock<IEmailService> _emailServiceMock;
        private readonly PrivateSurveyService _service;

        public PrivateSurveyServiceTests()
        {
            var options = new DbContextOptionsBuilder<FeedbackContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _context              = new FeedbackContext(options);
            _surveyRepository     = new Repository<int, Survey>(_context);
            _participantRepository = new Repository<int, SurveyParticipant>(_context);
            _emailServiceMock     = new Mock<IEmailService>();

            _service = new PrivateSurveyService(
                _surveyRepository,
                _participantRepository,
                _emailServiceMock.Object
            );
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private async Task<Survey> CreatePrivateSurvey(
            int creatorId = 1,
            bool isActive = true,
            bool isDeleted = false,
            DateTime? expireAt = null)
        {
            var survey = new Survey
            {
                Title = "Private Survey",
                Description = "Desc",
                PublicIdentifier = "priv-001",
                CreatedById = creatorId,
                IsPrivate = true,
                IsActive = isActive,
                IsDeleted = isDeleted,
                ExpireAt = expireAt,
                Questions = new List<Question>
                {
                    new Question { Text = "Q1", QuestionType = QuestionType.Text }
                }
            };

            await _surveyRepository.AddAsync(survey);
            return survey;
        }

        private async Task<SurveyParticipant> CreateParticipant(
            int surveyId,
            string email,
            bool isVerified = false,
            bool isCompleted = false,
            string? otp = null,
            DateTime? expiry = null)
        {
            var participant = new SurveyParticipant
            {
                SurveyId    = surveyId,
                Email       = email,
                IsVerified  = isVerified,
                IsCompleted = isCompleted,
                OTP         = otp,
                OTPExpiry   = expiry
            };

            await _participantRepository.AddAsync(participant);
            return participant;
        }

        // ── AddParticipantsAsync ─────────────────────────────────────────────

        [Fact]
        public async Task AddParticipants_ValidPrivateSurvey_AddsParticipants()
        {
            var survey = await CreatePrivateSurvey();

            var dto = new AddParticipantsDto
            {
                Emails = new List<string> { "test1@test.com", "test2@test.com" }
            };

            await _service.AddParticipantsAsync(survey.Id, survey.CreatedById, dto);

            var count = await _participantRepository.GetQueryable()
                .CountAsync(p => p.SurveyId == survey.Id);

            Assert.Equal(2, count);
        }

        [Fact]
        public async Task AddParticipants_SurveyNotFound_ThrowsNotFoundException()
        {
            var dto = new AddParticipantsDto { Emails = new List<string> { "a@test.com" } };

            await Assert.ThrowsAsync<NotFoundException>(() =>
                _service.AddParticipantsAsync(999, 1, dto));
        }

        [Fact]
        public async Task AddParticipants_NotOwner_ThrowsForbiddenException()
        {
            var survey = await CreatePrivateSurvey(creatorId: 1);
            var dto = new AddParticipantsDto { Emails = new List<string> { "a@test.com" } };

            await Assert.ThrowsAsync<ForbiddenException>(() =>
                _service.AddParticipantsAsync(survey.Id, creatorId: 2, dto));
        }

        [Fact]
        public async Task AddParticipants_PublicSurvey_ThrowsBadRequestException()
        {
            var survey = await CreatePrivateSurvey();
            survey.IsPrivate = false;
            await _surveyRepository.UpdateAsync(survey.Id, survey);

            var dto = new AddParticipantsDto { Emails = new List<string> { "a@test.com" } };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.AddParticipantsAsync(survey.Id, survey.CreatedById, dto));
        }

        [Fact]
        public async Task AddParticipants_InvalidEmail_ThrowsBadRequestException()
        {
            var survey = await CreatePrivateSurvey();

            var dto = new AddParticipantsDto
            {
                Emails = new List<string> { "invalid-email" }
            };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.AddParticipantsAsync(survey.Id, survey.CreatedById, dto));
        }

        // ── SendOtpAsync ──────────────────────────────────────────────────────

        [Fact]
        public async Task SendOtp_ValidParticipant_SetsOtpAndSendsEmail()
        {
            var survey = await CreatePrivateSurvey();
            var participant = await CreateParticipant(survey.Id, "otp@test.com");

            var dto = new SendOtpDto
            {
                SurveyId = survey.Id,
                Email = "otp@test.com"
            };

            await _service.SendOtpAsync(dto);

            var updated = await _participantRepository.GetByIdAsync(participant.Id);

            Assert.NotNull(updated!.OTP);
            Assert.True(updated.OTPExpiry > DateTime.UtcNow);
        }

        [Fact]
        public async Task SendOtp_NotInvited_ThrowsForbiddenException()
        {
            var survey = await CreatePrivateSurvey();

            var dto = new SendOtpDto
            {
                SurveyId = survey.Id,
                Email = "notinvited@test.com"
            };

            await Assert.ThrowsAsync<ForbiddenException>(() =>
                _service.SendOtpAsync(dto));
        }

        [Fact]
        public async Task SendOtp_AlreadyCompleted_ThrowsBadRequestException()
        {
            var survey = await CreatePrivateSurvey();
            await CreateParticipant(survey.Id, "done@test.com", isCompleted: true);

            var dto = new SendOtpDto
            {
                SurveyId = survey.Id,
                Email = "done@test.com"
            };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.SendOtpAsync(dto));
        }

        // ── VerifyOtpAsync ────────────────────────────────────────────────────

        [Fact]
        public async Task VerifyOtp_ValidOtp_MarksParticipantVerified()
        {
            var survey = await CreatePrivateSurvey();
            var participant = await CreateParticipant(
                survey.Id,
                "verify@test.com",
                otp: "123456",
                expiry: DateTime.UtcNow.AddMinutes(5));

            var dto = new VerifyOtpDto
            {
                SurveyId = survey.Id,
                Email = "verify@test.com",
                OTP = "123456"
            };

            await _service.VerifyOtpAsync(dto);

            var updated = await _participantRepository.GetByIdAsync(participant.Id);

            Assert.True(updated!.IsVerified);
            Assert.Null(updated.OTP);
            Assert.Null(updated.OTPExpiry);
        }

        [Fact]
        public async Task VerifyOtp_WrongOtp_ThrowsBadRequestException()
        {
            var survey = await CreatePrivateSurvey();
            await CreateParticipant(
                survey.Id,
                "wrong@test.com",
                otp: "111111",
                expiry: DateTime.UtcNow.AddMinutes(5));

            var dto = new VerifyOtpDto
            {
                SurveyId = survey.Id,
                Email = "wrong@test.com",
                OTP = "222222"
            };

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.VerifyOtpAsync(dto));
        }

        // ── GetPrivateSurveyAsync ─────────────────────────────────────────────

        [Fact]
        public async Task GetPrivateSurvey_VerifiedParticipant_ReturnsSurvey()
        {
            var survey = await CreatePrivateSurvey();
            await CreateParticipant(survey.Id, "access@test.com", isVerified: true);

            var result = await _service.GetPrivateSurveyAsync(survey.Id, "access@test.com");

            Assert.NotNull(result);
            Assert.Equal("Private Survey", result.Title);
            Assert.Single(result.Questions);
        }

        [Fact]
        public async Task GetPrivateSurvey_NotVerified_ThrowsForbiddenException()
        {
            var survey = await CreatePrivateSurvey();
            await CreateParticipant(survey.Id, "noverify@test.com");

            await Assert.ThrowsAsync<ForbiddenException>(() =>
                _service.GetPrivateSurveyAsync(survey.Id, "noverify@test.com"));
        }

        [Fact]
        public async Task GetPrivateSurvey_ExpiredSurvey_ThrowsBadRequestException()
        {
            var survey = await CreatePrivateSurvey(expireAt: DateTime.UtcNow.AddDays(-1));
            await CreateParticipant(survey.Id, "expired@test.com", isVerified: true);

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _service.GetPrivateSurveyAsync(survey.Id, "expired@test.com"));
        }
    }
}