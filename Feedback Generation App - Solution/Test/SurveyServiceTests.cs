using Feedback_Generation_App.Contexts;
using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Feedback_Generation_App.Repositories;
using Feedback_Generation_App.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Security.Claims;

namespace FeedbackBack_Unit_Tests
{
    /// <summary>
    /// Tests for SurveyService:
    ///   CreateSurvey, DeleteSurveyAsync, ToggleSurveyStatusAsync,
    ///   UpdateSurveyAsync, GetSurveyResponsesAsync,
    ///   GetSurveyAnalyticsAsync, GetSurveyResponseTrendAsync,
    ///   GetCreatorSurveysAsync
    /// </summary>
    public class SurveyServiceTests
    {
        private readonly FeedbackContext _context;
        private readonly IRepository<int, Survey> _surveyRepository;
        private readonly IRepository<int, QuestionBank> _bankRepository;
        private readonly IRepository<int, Response> _responseRepository;
        private readonly IRepository<int, AuditLog> _auditLogRepository;
        private readonly IRepository<int, User> _userRepository;
        private readonly IRepository<int, SurveyParticipant> _participantRepository;

        public SurveyServiceTests()
        {
            var options = new DbContextOptionsBuilder<FeedbackContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _context = new FeedbackContext(options);
            _surveyRepository = new Repository<int, Survey>(_context);
            _bankRepository = new Repository<int, QuestionBank>(_context);
            _responseRepository = new Repository<int, Response>(_context);
            _auditLogRepository = new Repository<int, AuditLog>(_context);
            _userRepository = new Repository<int, User>(_context);
            _participantRepository = new Repository<int, SurveyParticipant>(_context);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private SurveyService CreateService(string role = "Creator", int userId = 1)
        {
            var mockAccessor = new Mock<IHttpContextAccessor>();
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Name, "testuser")
            };
            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
            };
            mockAccessor.Setup(x => x.HttpContext).Returns(httpContext);
            var mockEmail = new Mock<IEmailService>();
            return new SurveyService(
                mockAccessor.Object, _surveyRepository, _bankRepository,
                _responseRepository, _auditLogRepository, _userRepository,
                mockEmail.Object, _participantRepository);
        }

        private async Task<User> AddUser(int id, string role = "Creator", bool isDeleted = false)
        {
            var user = new User
            {
                Username = $"user{id}",
                Email = $"user{id}@test.com",
                Password = new byte[] { 1 },
                PasswordHash = new byte[] { 2 },
                Role = role,
                IsDeleted = isDeleted
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        private async Task<Survey> AddSurvey(
            int createdById = 1,
            bool isActive = true,
            bool isDeleted = false,
            string title = "Test Survey",
            DateTime? expireAt = null,
            int? maxResponses = null)
        {
            var survey = new Survey
            {
                Title = title,
                Description = "Test Description",
                PublicIdentifier = Guid.NewGuid().ToString(),
                IsActive = isActive,
                CreatedById = createdById,
                IsDeleted = isDeleted,
                ExpireAt = expireAt,
                MaxResponses = maxResponses,
                Questions = new List<Question>
                {
                    new Question { Text = "Sample question", QuestionType = QuestionType.Text }
                }
            };
            return (await _surveyRepository.AddAsync(survey))!;
        }

        private async Task AddResponse(int surveyId, int questionId)
        {
            await _responseRepository.AddAsync(new Response
            {
                SurveyId = surveyId,
                ResponseToken = Guid.NewGuid().ToString(),
                Answers = new List<Answer>
                {
                    new Answer { QuestionId = questionId, AnswerText = "Test answer" }
                }
            });
        }

        // ── CreateSurvey ──────────────────────────────────────────────────────

        [Fact]
        public async Task CreateSurvey_ManualTextQuestion_SavedAndReturnsPublicIdentifier()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var dto = new CreateSurveyDto
            {
                Title = "My Survey",
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { Text = "How are you?", QuestionType = QuestionType.Text }
                }
            };

            var publicId = await service.CreateSurvey(dto, creatorId: 1);

            Assert.NotEmpty(publicId);
            var saved = await _surveyRepository.GetQueryable()
                .FirstOrDefaultAsync(s => s.PublicIdentifier == publicId);
            Assert.NotNull(saved);
            Assert.Equal("My Survey", saved!.Title);
        }

        [Fact]
        public async Task CreateSurvey_NewSurvey_IsActiveByDefault()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var dto = new CreateSurveyDto
            {
                Title = "Active Survey",
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { Text = "Q1", QuestionType = QuestionType.Text }
                }
            };

            var publicId = await service.CreateSurvey(dto, creatorId: 1);

            var saved = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.PublicIdentifier == publicId);
            Assert.True(saved.IsActive);
        }

        [Fact]
        public async Task CreateSurvey_WithQuestionBankReference_UsesBankQuestionText()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var bankQ = new QuestionBank
            {
                Text = "Bank Question",
                QuestionType = QuestionType.Rating,
                CreatedById = 1
            };
            await _bankRepository.AddAsync(bankQ);

            var dto = new CreateSurveyDto
            {
                Title = "Bank Survey",
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { QuestionBankId = bankQ.Id }
                }
            };

            var publicId = await service.CreateSurvey(dto, creatorId: 1);

            var saved = await _surveyRepository.GetQueryable()
                .Include(s => s.Questions)
                .FirstAsync(s => s.PublicIdentifier == publicId);
            Assert.Equal("Bank Question", saved.Questions!.First().Text);
        }

        [Fact]
        public async Task CreateSurvey_InvalidQuestionBankId_ThrowsBadRequestException()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var dto = new CreateSurveyDto
            {
                Title = "Bad Survey",
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { QuestionBankId = 9999 }
                }
            };

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateSurvey(dto, creatorId: 1)
            );
        }

        [Fact]
        public async Task CreateSurvey_WithExpiryAndMaxResponses_FieldsSaved()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var expiry = DateTime.UtcNow.AddDays(7);
            var dto = new CreateSurveyDto
            {
                Title = "Limited Survey",
                ExpireAt = expiry,
                MaxResponses = 50,
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { Text = "Q1", QuestionType = QuestionType.Text }
                }
            };

            var publicId = await service.CreateSurvey(dto, creatorId: 1);

            var saved = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.PublicIdentifier == publicId);
            Assert.Equal(50, saved.MaxResponses);
            Assert.NotNull(saved.ExpireAt);
        }

        [Fact]
        public async Task CreateSurvey_DeactivatedCreator_ThrowsForbiddenException()
        {
            await AddUser(1, isDeleted: true);
            var service = CreateService("Creator");
            var dto = new CreateSurveyDto
            {
                Title = "Survey",
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { Text = "Q1", QuestionType = QuestionType.Text }
                }
            };

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.CreateSurvey(dto, creatorId: 1)
            );
        }

        [Fact]
        public async Task CreateSurvey_PrivateSurvey_ParticipantsSaved()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var dto = new CreateSurveyDto
            {
                Title = "Private Survey",
                IsPrivate = true,
                ParticipantEmails = new List<string> { "alice@test.com", "bob@test.com" },
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { Text = "Q1", QuestionType = QuestionType.Text }
                }
            };

            var publicId = await service.CreateSurvey(dto, creatorId: 1);

            var survey = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.PublicIdentifier == publicId);
            var participants = await _participantRepository.GetQueryable()
                .Where(p => p.SurveyId == survey.Id)
                .ToListAsync();

            Assert.True(survey.IsPrivate);
            Assert.Equal(2, participants.Count);
        }

        [Fact]
        public async Task CreateSurvey_PrivateSurvey_InvalidEmail_ThrowsBadRequestException()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var dto = new CreateSurveyDto
            {
                Title = "Private Survey",
                IsPrivate = true,
                ParticipantEmails = new List<string> { "not-an-email" },
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { Text = "Q1", QuestionType = QuestionType.Text }
                }
            };

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.CreateSurvey(dto, creatorId: 1)
            );
        }

        [Fact]
        public async Task CreateSurvey_PrivateSurvey_DuplicateEmailsDeduped()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var dto = new CreateSurveyDto
            {
                Title = "Private Survey",
                IsPrivate = true,
                ParticipantEmails = new List<string> { "alice@test.com", "alice@test.com" },
                Questions = new List<CreateQuestionDto>
                {
                    new CreateQuestionDto { Text = "Q1", QuestionType = QuestionType.Text }
                }
            };

            var publicId = await service.CreateSurvey(dto, creatorId: 1);

            var survey = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.PublicIdentifier == publicId);
            var count = await _participantRepository.GetQueryable()
                .CountAsync(p => p.SurveyId == survey.Id);

            Assert.Equal(1, count);
        }

        // ── DeleteSurveyAsync ─────────────────────────────────────────────────

        [Fact]
        public async Task DeleteSurveyAsync_OwnSurvey_SoftDeleted()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);

            await service.DeleteSurveyAsync(survey.Id, userId: 1);

            var fromDb = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.Id == survey.Id);
            Assert.True(fromDb.IsDeleted);
        }

        [Fact]
        public async Task DeleteSurveyAsync_WritesAuditLog()
        {
            await AddUser(1);
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1, title: "Audit Survey");

            await service.DeleteSurveyAsync(survey.Id, userId: 1);

            var log = await _auditLogRepository.GetQueryable()
                .FirstOrDefaultAsync(a => a.SurveyId == survey.Id);
            Assert.NotNull(log);
            Assert.Equal("Survey Deleted", log!.Action);
        }

        [Fact]
        public async Task DeleteSurveyAsync_NonExistentSurvey_ThrowsNotFoundException()
        {
            var service = CreateService("Creator");

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.DeleteSurveyAsync(9999, userId: 1)
            );
        }

        [Fact]
        public async Task DeleteSurveyAsync_OtherUserSurvey_ThrowsForbiddenException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 99);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.DeleteSurveyAsync(survey.Id, userId: 1)
            );
        }

        [Fact]
        public async Task DeleteSurveyAsync_AdminCanDeleteAnySurvey()
        {
            var service = CreateService("Admin");
            var survey = await AddSurvey(createdById: 99);

            await service.DeleteSurveyAsync(survey.Id, userId: 1);

            var fromDb = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.Id == survey.Id);
            Assert.True(fromDb.IsDeleted);
        }

        // ── ToggleSurveyStatusAsync ───────────────────────────────────────────

        [Fact]
        public async Task ToggleSurveyStatusAsync_ActiveSurvey_BecomesInactive()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1, isActive: true);

            await service.ToggleSurveyStatusAsync(survey.Id, userId: 1);

            var fromDb = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.Id == survey.Id);
            Assert.False(fromDb.IsActive);
        }

        [Fact]
        public async Task ToggleSurveyStatusAsync_InactiveSurvey_BecomesActive()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1, isActive: false);

            await service.ToggleSurveyStatusAsync(survey.Id, userId: 1);

            var fromDb = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.Id == survey.Id);
            Assert.True(fromDb.IsActive);
        }

        [Fact]
        public async Task ToggleSurveyStatusAsync_WritesAuditLog()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1, isActive: true);

            await service.ToggleSurveyStatusAsync(survey.Id, userId: 1);

            var log = await _auditLogRepository.GetQueryable()
                .FirstOrDefaultAsync(a => a.SurveyId == survey.Id);
            Assert.NotNull(log);
            Assert.Equal("Survey Deactivated", log!.Action);
        }

        [Fact]
        public async Task ToggleSurveyStatusAsync_NonExistentSurvey_ThrowsNotFoundException()
        {
            var service = CreateService("Creator");

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.ToggleSurveyStatusAsync(9999, userId: 1)
            );
        }

        [Fact]
        public async Task ToggleSurveyStatusAsync_OtherUserSurvey_ThrowsForbiddenException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 99);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.ToggleSurveyStatusAsync(survey.Id, userId: 1)
            );
        }

        // ── UpdateSurveyAsync ─────────────────────────────────────────────────

        [Fact]
        public async Task UpdateSurveyAsync_ValidDto_TitleAndDescriptionUpdated()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1, title: "Old Title");
            var dto = new UpdateSurveyDto { Title = "New Title", Description = "New Desc" };

            await service.UpdateSurveyAsync(survey.Id, userId: 1, dto);

            var fromDb = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.Id == survey.Id);
            Assert.Equal("New Title", fromDb.Title);
            Assert.Equal("New Desc", fromDb.Description);
        }

        [Fact]
        public async Task UpdateSurveyAsync_UpdatesExpireAtAndMaxResponses()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);
            var newExpiry = DateTime.UtcNow.AddDays(30);
            var dto = new UpdateSurveyDto
            {
                Title = "Updated",
                Description = "",
                ExpireAt = newExpiry,
                MaxResponses = 100
            };

            await service.UpdateSurveyAsync(survey.Id, userId: 1, dto);

            var fromDb = await _surveyRepository.GetQueryable()
                .FirstAsync(s => s.Id == survey.Id);
            Assert.Equal(100, fromDb.MaxResponses);
            Assert.NotNull(fromDb.ExpireAt);
        }

        [Fact]
        public async Task UpdateSurveyAsync_WritesAuditLog()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);
            var dto = new UpdateSurveyDto { Title = "Updated", Description = "" };

            await service.UpdateSurveyAsync(survey.Id, userId: 1, dto);

            var log = await _auditLogRepository.GetQueryable()
                .FirstOrDefaultAsync(a => a.SurveyId == survey.Id);
            Assert.NotNull(log);
            Assert.Equal("Survey Updated", log!.Action);
        }

        [Fact]
        public async Task UpdateSurveyAsync_EmptyTitle_ThrowsBadRequestException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateSurveyAsync(survey.Id, userId: 1,
                    new UpdateSurveyDto { Title = "", Description = "Fine" })
            );
        }

        [Fact]
        public async Task UpdateSurveyAsync_WhitespaceTitle_ThrowsBadRequestException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await service.UpdateSurveyAsync(survey.Id, userId: 1,
                    new UpdateSurveyDto { Title = "   ", Description = "Fine" })
            );
        }

        [Fact]
        public async Task UpdateSurveyAsync_OtherUserSurvey_ThrowsForbiddenException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 99);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.UpdateSurveyAsync(survey.Id, userId: 1,
                    new UpdateSurveyDto { Title = "Hacked", Description = "" })
            );
        }

        [Fact]
        public async Task UpdateSurveyAsync_NonExistentSurvey_ThrowsNotFoundException()
        {
            var service = CreateService("Creator");

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.UpdateSurveyAsync(9999, userId: 1,
                    new UpdateSurveyDto { Title = "Title", Description = "" })
            );
        }

        // ── GetSurveyResponsesAsync ───────────────────────────────────────────

        [Fact]
        public async Task GetSurveyResponsesAsync_SurveyWithResponses_ReturnsCorrectCount()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);
            var question = await _context.Set<Question>()
                .FirstAsync(q => q.SurveyId == survey.Id);

            await AddResponse(survey.Id, question.Id);
            await AddResponse(survey.Id, question.Id);

            var result = await service.GetSurveyResponsesAsync(
                survey.Id, userId: 1,
                new GetSurveyResponsesRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(survey.Id, result.SurveyId);
            Assert.Equal(2, result.TotalResponses);
        }

        [Fact]
        public async Task GetSurveyResponsesAsync_NoResponses_ReturnsTotalZero()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);

            var result = await service.GetSurveyResponsesAsync(
                survey.Id, userId: 1,
                new GetSurveyResponsesRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(0, result.TotalResponses);
            Assert.Empty(result.Responses!);
        }

        [Fact]
        public async Task GetSurveyResponsesAsync_Pagination_ReturnsCorrectPage()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);
            var question = await _context.Set<Question>()
                .FirstAsync(q => q.SurveyId == survey.Id);

            for (int i = 0; i < 5; i++)
                await AddResponse(survey.Id, question.Id);

            var result = await service.GetSurveyResponsesAsync(
                survey.Id, userId: 1,
                new GetSurveyResponsesRequestDto { PageNumber = 2, PageSize = 2 });

            Assert.Equal(5, result.TotalResponses);
            Assert.Equal(2, result.Responses!.Count);
        }

        [Fact]
        public async Task GetSurveyResponsesAsync_NonExistentSurvey_ThrowsNotFoundException()
        {
            var service = CreateService("Creator");

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.GetSurveyResponsesAsync(9999, userId: 1,
                    new GetSurveyResponsesRequestDto { PageNumber = 1, PageSize = 10 })
            );
        }

        [Fact]
        public async Task GetSurveyResponsesAsync_OtherUserSurvey_ThrowsForbiddenException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 99);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.GetSurveyResponsesAsync(survey.Id, userId: 1,
                    new GetSurveyResponsesRequestDto { PageNumber = 1, PageSize = 10 })
            );
        }

        [Fact]
        public async Task GetSurveyResponsesAsync_AdminCanAccessAnySurvey()
        {
            var service = CreateService("Admin");
            var survey = await AddSurvey(createdById: 99);
            var question = await _context.Set<Question>()
                .FirstAsync(q => q.SurveyId == survey.Id);
            await AddResponse(survey.Id, question.Id);

            var result = await service.GetSurveyResponsesAsync(
                survey.Id, userId: 1,
                new GetSurveyResponsesRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalResponses);
        }

        // ── GetSurveyAnalyticsAsync ───────────────────────────────────────────

        [Fact]
        public async Task GetSurveyAnalyticsAsync_ValidSurvey_ReturnsTitleAndId()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1, title: "Analytics Survey");

            var result = await service.GetSurveyAnalyticsAsync(survey.Id, userId: 1);

            Assert.NotNull(result);
            Assert.Equal(survey.Id, result.SurveyId);
            Assert.Equal("Analytics Survey", result.Title);
        }

        [Fact]
        public async Task GetSurveyAnalyticsAsync_NoResponses_TotalResponsesIsZero()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);

            var result = await service.GetSurveyAnalyticsAsync(survey.Id, userId: 1);

            Assert.Equal(0, result.TotalResponses);
        }

        [Fact]
        public async Task GetSurveyAnalyticsAsync_QuestionsIncludedInResult()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);

            var result = await service.GetSurveyAnalyticsAsync(survey.Id, userId: 1);

            Assert.NotEmpty(result.Questions);
        }

        [Fact]
        public async Task GetSurveyAnalyticsAsync_NonExistentSurvey_ThrowsException()
        {
            var service = CreateService("Creator");

            await Assert.ThrowsAsync<ArgumentException>(async () =>
                await service.GetSurveyAnalyticsAsync(9999, userId: 1)
            );
        }

        [Fact]
        public async Task GetSurveyAnalyticsAsync_OtherUserSurvey_ThrowsException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 99);

            await Assert.ThrowsAsync<ArgumentException>(async () =>
                await service.GetSurveyAnalyticsAsync(survey.Id, userId: 1)
            );
        }

        [Fact]
        public async Task GetSurveyAnalyticsAsync_AdminCanAccessAnySurvey()
        {
            var service = CreateService("Admin");
            var survey = await AddSurvey(createdById: 99, title: "Admin Analytics");

            var result = await service.GetSurveyAnalyticsAsync(survey.Id, userId: 1);

            Assert.Equal("Admin Analytics", result.Title);
        }

        // ── GetSurveyResponseTrendAsync ───────────────────────────────────────

        [Fact]
        public async Task GetSurveyResponseTrendAsync_WithResponses_ReturnsTrendGroupedByDate()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);
            var question = await _context.Set<Question>()
                .FirstAsync(q => q.SurveyId == survey.Id);

            await AddResponse(survey.Id, question.Id);
            await AddResponse(survey.Id, question.Id);

            var result = await service.GetSurveyResponseTrendAsync(survey.Id, userId: 1);

            Assert.NotEmpty(result);
            Assert.All(result, r =>
            {
                Assert.NotEmpty(r.Date);
                Assert.True(r.Count > 0);
            });
        }

        [Fact]
        public async Task GetSurveyResponseTrendAsync_NoResponses_ReturnsEmptyList()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 1);

            var result = await service.GetSurveyResponseTrendAsync(survey.Id, userId: 1);

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetSurveyResponseTrendAsync_NonExistentSurvey_ThrowsNotFoundException()
        {
            var service = CreateService("Creator");

            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await service.GetSurveyResponseTrendAsync(9999, userId: 1)
            );
        }

        [Fact]
        public async Task GetSurveyResponseTrendAsync_OtherUserSurvey_ThrowsForbiddenException()
        {
            var service = CreateService("Creator");
            var survey = await AddSurvey(createdById: 99);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await service.GetSurveyResponseTrendAsync(survey.Id, userId: 1)
            );
        }

        // ── GetCreatorSurveysAsync ────────────────────────────────────────────

        [Fact]
        public async Task GetCreatorSurveysAsync_ReturnsOnlyOwnSurveys()
        {
            var service = CreateService("Creator");
            await AddSurvey(createdById: 1, title: "Mine");
            await AddSurvey(createdById: 99, title: "Not Mine");

            var result = await service.GetCreatorSurveysAsync(
                userId: 1,
                new GetMySurveysRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("Mine", result.Surveys[0].Title);
        }

        [Fact]
        public async Task GetCreatorSurveysAsync_ExcludesDeletedSurveys()
        {
            var service = CreateService("Creator");
            await AddSurvey(createdById: 1, title: "Active");
            await AddSurvey(createdById: 1, title: "Deleted", isDeleted: true);

            var result = await service.GetCreatorSurveysAsync(
                userId: 1,
                new GetMySurveysRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("Active", result.Surveys[0].Title);
        }

        [Fact]
        public async Task GetCreatorSurveysAsync_FilterByActiveStatus_ReturnsOnlyActive()
        {
            var service = CreateService("Creator");
            await AddSurvey(createdById: 1, isActive: true, title: "Active");
            await AddSurvey(createdById: 1, isActive: false, title: "Inactive");

            var result = await service.GetCreatorSurveysAsync(
                userId: 1,
                new GetMySurveysRequestDto { PageNumber = 1, PageSize = 10, IsActive = true });

            Assert.Equal(1, result.TotalCount);
            Assert.True(result.Surveys[0].IsActive);
        }

        [Fact]
        public async Task GetCreatorSurveysAsync_NoSurveys_ReturnsEmptyResult()
        {
            var service = CreateService("Creator");

            var result = await service.GetCreatorSurveysAsync(
                userId: 1,
                new GetMySurveysRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(0, result.TotalCount);
            Assert.Empty(result.Surveys);
        }

        [Fact]
        public async Task GetCreatorSurveysAsync_ExpiredSurvey_AutoDeactivated()
        {
            var service = CreateService("Creator");
            await AddSurvey(
                createdById: 1,
                isActive: true,
                title: "Expired Survey",
                expireAt: DateTime.UtcNow.AddDays(-1));

            var result = await service.GetCreatorSurveysAsync(
                userId: 1,
                new GetMySurveysRequestDto { PageNumber = 1, PageSize = 10 });

            // Auto-deactivation should have set IsActive = false
            Assert.False(result.Surveys[0].IsActive);
            Assert.True(result.Surveys[0].IsLocked);
        }
    }
}