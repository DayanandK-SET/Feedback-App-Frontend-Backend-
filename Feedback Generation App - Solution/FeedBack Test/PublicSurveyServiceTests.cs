using Feedback_Generation_App.Contexts;
using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Feedback_Generation_App.Repositories;
using Feedback_Generation_App.Services;
using Microsoft.EntityFrameworkCore;

namespace FeedbackBack_Unit_Tests
{
    /// <summary>
    /// Tests for PublicSurveyService: GetSurvey, SubmitSurvey
    /// Note: Private surveys are blocked at the public endpoint level.
    /// </summary>
    public class PublicSurveyServiceTests
    {
        private readonly FeedbackContext _context;
        private readonly IRepository<int, Survey> _surveyRepository;
        private readonly IRepository<int, Response> _responseRepository;
        private readonly PublicSurveyService _service;

        public PublicSurveyServiceTests()
        {
            var options = new DbContextOptionsBuilder<FeedbackContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _context            = new FeedbackContext(options);
            _surveyRepository   = new Repository<int, Survey>(_context);
            _responseRepository = new Repository<int, Response>(_context);

            _service = new PublicSurveyService(_surveyRepository, _responseRepository);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private async Task<Survey> CreateSurvey(
            string identifier,
            bool isActive      = true,
            bool isDeleted     = false,
            bool isPrivate     = false,
            DateTime? expireAt = null,
            int? maxResponses  = null)
        {
            var survey = new Survey
            {
                Title            = "Test Survey",
                Description      = "Test Description",
                PublicIdentifier = identifier,
                IsActive         = isActive,
                IsDeleted        = isDeleted,
                IsPrivate        = isPrivate,
                CreatedById      = 1,
                ExpireAt         = expireAt,
                MaxResponses     = maxResponses,
                Questions        = new List<Question>
                {
                    new Question { Text = "Text question",   QuestionType = QuestionType.Text },
                    new Question { Text = "Rating question", QuestionType = QuestionType.Rating }
                }
            };
            await _surveyRepository.AddAsync(survey);
            return survey;
        }

        private SubmitSurveyDto MakeValidSubmit(Survey survey, string token = "token-001")
        {
            var questions = _context.Set<Question>()
                .Where(q => q.SurveyId == survey.Id)
                .ToList();

            return new SubmitSurveyDto
            {
                ResponseToken = token,
                Answers = questions.Select(q => new SubmitAnswerDto
                {
                    QuestionId  = q.Id,
                    TextAnswer  = q.QuestionType == QuestionType.Text   ? "Great!" : null,
                    RatingValue = q.QuestionType == QuestionType.Rating ? 8        : null
                }).ToList()
            };
        }

        // ── GetSurvey ─────────────────────────────────────────────────────────

        [Fact]
        public async Task GetSurvey_ActivePublicSurvey_ReturnsSurveyDto()
        {
            await CreateSurvey("active-001");

            var result = await _service.GetSurvey("active-001");

            Assert.NotNull(result);
            Assert.Equal("Test Survey", result!.Title);
            Assert.Equal(2, result.Questions.Count);
        }

        [Fact]
        public async Task GetSurvey_QuestionsHaveCorrectIds()
        {
            await CreateSurvey("qids-001");

            var result = await _service.GetSurvey("qids-001");

            Assert.NotNull(result);
            Assert.All(result!.Questions, q => Assert.True(q.QuestionId > 0));
        }

        [Fact]
        public async Task GetSurvey_InactiveSurvey_ReturnsNull()
        {
            await CreateSurvey("inactive-001", isActive: false);

            var result = await _service.GetSurvey("inactive-001");

            Assert.Null(result);
        }

        [Fact]
        public async Task GetSurvey_DeletedSurvey_ReturnsNull()
        {
            await CreateSurvey("deleted-001", isDeleted: true);

            var result = await _service.GetSurvey("deleted-001");

            Assert.Null(result);
        }

        [Fact]
        public async Task GetSurvey_NonExistentIdentifier_ReturnsNull()
        {
            var result = await _service.GetSurvey("does-not-exist");

            Assert.Null(result);
        }

        [Fact]
        public async Task GetSurvey_ExpiredSurvey_ThrowsBadRequestException()
        {
            await CreateSurvey("expired-001", expireAt: DateTime.UtcNow.AddDays(-1));

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _service.GetSurvey("expired-001")
            );
        }

        [Fact]
        public async Task GetSurvey_SurveyExpiringInFuture_ReturnsSurveyDto()
        {
            await CreateSurvey("future-001", expireAt: DateTime.UtcNow.AddDays(1));

            var result = await _service.GetSurvey("future-001");

            Assert.NotNull(result);
        }

        [Fact]
        public async Task GetSurvey_PrivateSurvey_ThrowsForbiddenException()
        {
            // Private surveys must not be accessible via the public endpoint
            await CreateSurvey("private-001", isPrivate: true);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await _service.GetSurvey("private-001")
            );
        }

        // ── SubmitSurvey ──────────────────────────────────────────────────────

        [Fact]
        public async Task SubmitSurvey_ValidAnswers_ResponseSavedToDatabase()
        {
            var survey = await CreateSurvey("submit-001");
            var dto    = MakeValidSubmit(survey, "token-submit-001");

            await _service.SubmitSurvey("submit-001", dto);

            var saved = await _responseRepository.GetQueryable()
                .FirstOrDefaultAsync(r =>
                    r.SurveyId == survey.Id && r.ResponseToken == "token-submit-001");
            Assert.NotNull(saved);
        }

        [Fact]
        public async Task SubmitSurvey_AnswersAreSavedWithResponse()
        {
            var survey = await CreateSurvey("answers-001");
            var dto    = MakeValidSubmit(survey, "token-answers");

            await _service.SubmitSurvey("answers-001", dto);

            var response = await _responseRepository.GetQueryable()
                .Include(r => r.Answers)
                .FirstAsync(r => r.ResponseToken == "token-answers");

            Assert.NotNull(response.Answers);
            Assert.Equal(2, response.Answers!.Count);
        }

        [Fact]
        public async Task SubmitSurvey_DuplicateToken_ThrowsArgumentException()
        {
            var survey = await CreateSurvey("dup-001");
            var dto    = MakeValidSubmit(survey, "same-token");

            await _service.SubmitSurvey("dup-001", dto);

            await Assert.ThrowsAsync<ArgumentException>(async () =>
                await _service.SubmitSurvey("dup-001", dto)
            );
        }

        [Fact]
        public async Task SubmitSurvey_EmptyResponseToken_ThrowsArgumentException()
        {
            var survey = await CreateSurvey("empty-token-001");
            var dto    = MakeValidSubmit(survey, "");

            await Assert.ThrowsAsync<ArgumentException>(async () =>
                await _service.SubmitSurvey("empty-token-001", dto)
            );
        }

        [Fact]
        public async Task SubmitSurvey_InactiveSurvey_ThrowsBadRequestException()
        {
            await CreateSurvey("inactive-submit-001", isActive: false);

            var dto = new SubmitSurveyDto
            {
                ResponseToken = "token-999",
                Answers       = new List<SubmitAnswerDto>()
            };

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _service.SubmitSurvey("inactive-submit-001", dto)
            );
        }

        [Fact]
        public async Task SubmitSurvey_ExpiredSurvey_ThrowsBadRequestException()
        {
            await CreateSurvey("expired-submit-001", expireAt: DateTime.UtcNow.AddDays(-1));

            var dto = new SubmitSurveyDto
            {
                ResponseToken = "token-expired",
                Answers       = new List<SubmitAnswerDto>()
            };

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _service.SubmitSurvey("expired-submit-001", dto)
            );
        }

        [Fact]
        public async Task SubmitSurvey_MaxResponsesReached_ThrowsBadRequestException()
        {
            var survey = await CreateSurvey("maxresp-001", maxResponses: 1);
            var dto1   = MakeValidSubmit(survey, "first-token");
            await _service.SubmitSurvey("maxresp-001", dto1);

            var dto2 = MakeValidSubmit(survey, "second-token");
            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _service.SubmitSurvey("maxresp-001", dto2)
            );
        }

        [Fact]
        public async Task SubmitSurvey_BelowMaxResponses_BothSubmissionsAccepted()
        {
            var survey = await CreateSurvey("multi-001", maxResponses: 2);
            await _service.SubmitSurvey("multi-001", MakeValidSubmit(survey, "token-A"));
            await _service.SubmitSurvey("multi-001", MakeValidSubmit(survey, "token-B"));

            var count = await _responseRepository.GetQueryable()
                .CountAsync(r => r.SurveyId == survey.Id && !r.IsDeleted);
            Assert.Equal(2, count);
        }

        [Fact]
        public async Task SubmitSurvey_PrivateSurvey_ThrowsForbiddenException()
        {
            var survey = await CreateSurvey("private-submit-001", isPrivate: true);
            var dto    = MakeValidSubmit(survey, "token-private");

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await _service.SubmitSurvey("private-submit-001", dto)
            );
        }

        [Fact]
        public async Task SubmitSurvey_InvalidQuestionId_ThrowsArgumentException()
        {
            var survey = await CreateSurvey("invalid-q-001");

            var dto = new SubmitSurveyDto
            {
                ResponseToken = "token-invalid-q",
                Answers = new List<SubmitAnswerDto>
                {
                    new SubmitAnswerDto { QuestionId = 99999, TextAnswer = "answer" }
                }
            };

            await Assert.ThrowsAsync<ArgumentException>(async () =>
                await _service.SubmitSurvey("invalid-q-001", dto)
            );
        }
    }
}
