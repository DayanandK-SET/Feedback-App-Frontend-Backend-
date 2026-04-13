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
    /// Tests for QuestionBankService:
    ///   CreateQuestionsAsync, GetMyQuestionsAsync,
    ///   UpdateQuestionAsync, DeleteQuestionAsync
    /// </summary>
    public class QuestionBankServiceTests
    {
        private readonly FeedbackContext _context;
        private readonly IRepository<int, QuestionBank> _questionBankRepository;
        private readonly QuestionBankService _questionBankService;

        public QuestionBankServiceTests()
        {
            var options = new DbContextOptionsBuilder<FeedbackContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new FeedbackContext(options);
            _questionBankRepository = new Repository<int, QuestionBank>(_context);
            _questionBankService = new QuestionBankService(_questionBankRepository);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private List<CreateQuestionBankDto> MakeDtos(params (string text, QuestionType type)[] items)
        {
            return items.Select(i => new CreateQuestionBankDto
            {
                Text         = i.text,
                QuestionType = i.type
            }).ToList();
        }

        private async Task<QuestionBank> CreateQuestion(
            string text,
            QuestionType type,
            int userId,
            List<string>? options = null)
        {
            var dtos = new List<CreateQuestionBankDto>
            {
                new CreateQuestionBankDto
                {
                    Text         = text,
                    QuestionType = type,
                    Options      = options
                }
            };
            var ids = await _questionBankService.CreateQuestionsAsync(dtos, userId);
            return await _questionBankRepository.GetQueryable()
                .Include(q => q.Options)
                .FirstAsync(q => q.Id == ids[0]);
        }

        // ══════════════════════════════════════════════════
        // CreateQuestionsAsync
        // ══════════════════════════════════════════════════

        [Fact]
        public async Task CreateQuestionsAsync_SingleTextQuestion_ReturnsOneId()
        {
            var dtos = MakeDtos(("How was your experience?", QuestionType.Text));

            var ids = await _questionBankService.CreateQuestionsAsync(dtos, userId: 1);

            Assert.NotNull(ids);
            Assert.Single(ids);
            Assert.True(ids[0] > 0);
        }

        [Fact]
        public async Task CreateQuestionsAsync_SingleRatingQuestion_IsSavedWithCorrectType()
        {
            var dtos = MakeDtos(("Rate our service", QuestionType.Rating));

            var ids = await _questionBankService.CreateQuestionsAsync(dtos, userId: 1);

            var saved = await _questionBankRepository.GetQueryable()
                .FirstAsync(q => q.Id == ids[0]);
            Assert.Equal(QuestionType.Rating, saved.QuestionType);
        }

        [Fact]
        public async Task CreateQuestionsAsync_MultipleChoiceWithOptions_OptionsAreSaved()
        {
            var dtos = new List<CreateQuestionBankDto>
            {
                new CreateQuestionBankDto
                {
                    Text         = "Would you recommend us?",
                    QuestionType = QuestionType.MultipleChoice,
                    Options      = new List<string> { "Yes", "No", "Maybe" }
                }
            };

            var ids = await _questionBankService.CreateQuestionsAsync(dtos, userId: 1);

            var saved = await _questionBankRepository.GetQueryable()
                .Include(q => q.Options)
                .FirstAsync(q => q.Id == ids[0]);

            Assert.NotNull(saved.Options);
            Assert.Equal(3, saved.Options!.Count);
            Assert.Contains(saved.Options, o => o.OptionText == "Yes");
            Assert.Contains(saved.Options, o => o.OptionText == "No");
            Assert.Contains(saved.Options, o => o.OptionText == "Maybe");
        }

        [Fact]
        public async Task CreateQuestionsAsync_MultipleQuestions_ReturnsAllIds()
        {
            var dtos = new List<CreateQuestionBankDto>
            {
                new CreateQuestionBankDto { Text = "Q1", QuestionType = QuestionType.Text },
                new CreateQuestionBankDto { Text = "Q2", QuestionType = QuestionType.Rating },
                new CreateQuestionBankDto
                {
                    Text         = "Q3",
                    QuestionType = QuestionType.MultipleChoice,
                    Options      = new List<string> { "A", "B" }
                }
            };

            var ids = await _questionBankService.CreateQuestionsAsync(dtos, userId: 1);

            Assert.Equal(3, ids.Count);
            Assert.All(ids, id => Assert.True(id > 0));
            Assert.Equal(ids.Count, ids.Distinct().Count());
        }

        [Fact]
        public async Task CreateQuestionsAsync_QuestionsLinkedToCreator_CreatedByIdIsSet()
        {
            var dtos = MakeDtos(("My question", QuestionType.Text));

            var ids = await _questionBankService.CreateQuestionsAsync(dtos, userId: 42);

            var saved = await _questionBankRepository.GetQueryable()
                .FirstAsync(q => q.Id == ids[0]);
            Assert.Equal(42, saved.CreatedById);
        }

        [Fact]
        public async Task CreateQuestionsAsync_EmptyList_ThrowsBadRequestException()
        {
            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _questionBankService.CreateQuestionsAsync(new List<CreateQuestionBankDto>(), userId: 1)
            );
        }

        [Fact]
        public async Task CreateQuestionsAsync_NullList_ThrowsBadRequestException()
        {
            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _questionBankService.CreateQuestionsAsync(null!, userId: 1)
            );
        }

        [Fact]
        public async Task CreateQuestionsAsync_BlankQuestionText_ThrowsBadRequestException()
        {
            var dtos = new List<CreateQuestionBankDto>
            {
                new CreateQuestionBankDto { Text = "   ", QuestionType = QuestionType.Text }
            };

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _questionBankService.CreateQuestionsAsync(dtos, userId: 1)
            );
        }

        // ══════════════════════════════════════════════════
        // GetMyQuestionsAsync
        // ══════════════════════════════════════════════════

        [Fact]
        public async Task GetMyQuestionsAsync_CreatorUser_ReturnsOnlyOwnQuestions()
        {
            await _questionBankService.CreateQuestionsAsync(
                MakeDtos(("C1 Q1", QuestionType.Text), ("C1 Q2", QuestionType.Rating)), userId: 1);
            await _questionBankService.CreateQuestionsAsync(
                MakeDtos(("C2 Q1", QuestionType.Text)), userId: 2);

            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 1, isAdmin: false,
                new GetQuestionBankRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(2, result.TotalCount);
            Assert.All(result.Questions, q => Assert.StartsWith("C1", q.Text));
        }

        [Fact]
        public async Task GetMyQuestionsAsync_AdminUser_ReturnsAllCreatorsQuestions()
        {
            await _questionBankService.CreateQuestionsAsync(
                MakeDtos(("C1 Q1", QuestionType.Text)), userId: 1);
            await _questionBankService.CreateQuestionsAsync(
                MakeDtos(("C2 Q1", QuestionType.Text)), userId: 2);

            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 1, isAdmin: true,
                new GetQuestionBankRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(2, result.TotalCount);
        }

        [Fact]
        public async Task GetMyQuestionsAsync_ResponseIncludesCreatedById()
        {
            // CreatedById is returned so the frontend can show edit/delete only to the owner
            await _questionBankService.CreateQuestionsAsync(
                MakeDtos(("My Q", QuestionType.Text)), userId: 7);

            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 7, isAdmin: false,
                new GetQuestionBankRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Single(result.Questions);
            Assert.Equal(7, result.Questions[0].CreatedById);
        }

        [Fact]
        public async Task GetMyQuestionsAsync_TypeFilter_ReturnsOnlyMatchingType()
        {
            await _questionBankService.CreateQuestionsAsync(
                new List<CreateQuestionBankDto>
                {
                    new CreateQuestionBankDto { Text = "Text Q",   QuestionType = QuestionType.Text },
                    new CreateQuestionBankDto { Text = "Rating Q", QuestionType = QuestionType.Rating },
                    new CreateQuestionBankDto
                    {
                        Text = "MC Q", QuestionType = QuestionType.MultipleChoice,
                        Options = new List<string> { "A", "B" }
                    }
                }, userId: 1);

            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 1, isAdmin: false,
                new GetQuestionBankRequestDto { PageNumber = 1, PageSize = 10, QuestionType = QuestionType.Rating });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal(QuestionType.Rating, result.Questions[0].QuestionType);
        }

        [Fact]
        public async Task GetMyQuestionsAsync_Pagination_ReturnsCorrectPageAndCount()
        {
            await _questionBankService.CreateQuestionsAsync(
                Enumerable.Range(1, 5)
                    .Select(i => new CreateQuestionBankDto
                    {
                        Text = $"Question {i}", QuestionType = QuestionType.Text
                    }).ToList(), userId: 1);

            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 1, isAdmin: false,
                new GetQuestionBankRequestDto { PageNumber = 2, PageSize = 2 });

            Assert.Equal(5, result.TotalCount);
            Assert.Equal(2, result.Questions.Count);
            Assert.Equal(2, result.PageNumber);
        }

        [Fact]
        public async Task GetMyQuestionsAsync_NoQuestions_ReturnsEmptyResult()
        {
            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 99, isAdmin: false,
                new GetQuestionBankRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(0, result.TotalCount);
            Assert.Empty(result.Questions);
        }

        // ══════════════════════════════════════════════════
        // UpdateQuestionAsync
        // ══════════════════════════════════════════════════

        [Fact]
        public async Task UpdateQuestionAsync_Owner_TextIsUpdated()
        {
            var q = await CreateQuestion("Original text", QuestionType.Text, userId: 1);

            await _questionBankService.UpdateQuestionAsync(
                q.Id, userId: 1,
                new UpdateQuestionBankDto { Text = "Updated text" });

            var updated = await _questionBankRepository.GetQueryable()
                .FirstAsync(x => x.Id == q.Id);
            Assert.Equal("Updated text", updated.Text);
        }

        [Fact]
        public async Task UpdateQuestionAsync_MultipleChoice_OptionsAreReplaced()
        {
            var q = await CreateQuestion(
                "MC Question", QuestionType.MultipleChoice, userId: 1,
                options: new List<string> { "Old A", "Old B" });

            await _questionBankService.UpdateQuestionAsync(
                q.Id, userId: 1,
                new UpdateQuestionBankDto
                {
                    Text    = "MC Question",
                    Options = new List<string> { "New A", "New B", "New C" }
                });

            var updated = await _questionBankRepository.GetQueryable()
                .Include(x => x.Options)
                .FirstAsync(x => x.Id == q.Id);

            Assert.Equal(3, updated.Options!.Count);
            Assert.Contains(updated.Options, o => o.OptionText == "New A");
            Assert.DoesNotContain(updated.Options, o => o.OptionText == "Old A");
        }

        [Fact]
        public async Task UpdateQuestionAsync_MultipleChoice_LessThanTwoOptions_ThrowsBadRequestException()
        {
            var q = await CreateQuestion(
                "MC Q", QuestionType.MultipleChoice, userId: 1,
                options: new List<string> { "A", "B" });

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _questionBankService.UpdateQuestionAsync(
                    q.Id, userId: 1,
                    new UpdateQuestionBankDto
                    {
                        Text    = "MC Q",
                        Options = new List<string> { "Only one" }
                    })
            );
        }

        [Fact]
        public async Task UpdateQuestionAsync_NotOwner_ThrowsForbiddenException()
        {
            // Question created by user 1, update attempted by user 2
            var q = await CreateQuestion("Q", QuestionType.Text, userId: 1);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await _questionBankService.UpdateQuestionAsync(
                    q.Id, userId: 2,
                    new UpdateQuestionBankDto { Text = "Hacked" })
            );
        }

        [Fact]
        public async Task UpdateQuestionAsync_AdminOwnsQuestion_CanUpdate()
        {
            // Admin created this question — they should be able to edit it
            var q = await CreateQuestion("Admin Q", QuestionType.Text, userId: 99);

            await _questionBankService.UpdateQuestionAsync(
                q.Id, userId: 99,
                new UpdateQuestionBankDto { Text = "Admin Updated" });

            var updated = await _questionBankRepository.GetQueryable()
                .FirstAsync(x => x.Id == q.Id);
            Assert.Equal("Admin Updated", updated.Text);
        }

        [Fact]
        public async Task UpdateQuestionAsync_NonExistentQuestion_ThrowsNotFoundException()
        {
            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _questionBankService.UpdateQuestionAsync(
                    9999, userId: 1,
                    new UpdateQuestionBankDto { Text = "Doesn't matter" })
            );
        }

        [Fact]
        public async Task UpdateQuestionAsync_BlankText_ThrowsBadRequestException()
        {
            var q = await CreateQuestion("Q", QuestionType.Text, userId: 1);

            await Assert.ThrowsAsync<BadRequestException>(async () =>
                await _questionBankService.UpdateQuestionAsync(
                    q.Id, userId: 1,
                    new UpdateQuestionBankDto { Text = "   " })
            );
        }

        [Fact]
        public async Task UpdateQuestionAsync_UpdatedAtIsSet()
        {
            var q = await CreateQuestion("Q", QuestionType.Text, userId: 1);
            Assert.Null(q.UpdatedAt);

            await _questionBankService.UpdateQuestionAsync(
                q.Id, userId: 1,
                new UpdateQuestionBankDto { Text = "Updated" });

            var updated = await _questionBankRepository.GetQueryable()
                .FirstAsync(x => x.Id == q.Id);
            Assert.NotNull(updated.UpdatedAt);
        }

        // ══════════════════════════════════════════════════
        // DeleteQuestionAsync
        // ══════════════════════════════════════════════════

        [Fact]
        public async Task DeleteQuestionAsync_Owner_QuestionIsSoftDeleted()
        {
            var q = await CreateQuestion("To Delete", QuestionType.Text, userId: 1);

            await _questionBankService.DeleteQuestionAsync(q.Id, userId: 1);

            var fromDb = await _questionBankRepository.GetQueryable()
                .IgnoreQueryFilters()
                .FirstAsync(x => x.Id == q.Id);
            Assert.True(fromDb.IsDeleted);
        }

        [Fact]
        public async Task DeleteQuestionAsync_NotOwner_ThrowsForbiddenException()
        {
            // Question created by user 1, delete attempted by user 2
            var q = await CreateQuestion("Q", QuestionType.Text, userId: 1);

            await Assert.ThrowsAsync<ForbiddenException>(async () =>
                await _questionBankService.DeleteQuestionAsync(q.Id, userId: 2)
            );
        }

        [Fact]
        public async Task DeleteQuestionAsync_AdminOwnsQuestion_CanDelete()
        {
            // Admin created this question — they should be able to delete it
            var q = await CreateQuestion("Admin Q", QuestionType.Text, userId: 99);

            await _questionBankService.DeleteQuestionAsync(q.Id, userId: 99);

            var fromDb = await _questionBankRepository.GetQueryable()
                .IgnoreQueryFilters()
                .FirstAsync(x => x.Id == q.Id);
            Assert.True(fromDb.IsDeleted);
        }

        [Fact]
        public async Task DeleteQuestionAsync_NonExistentQuestion_ThrowsNotFoundException()
        {
            await Assert.ThrowsAsync<NotFoundException>(async () =>
                await _questionBankService.DeleteQuestionAsync(9999, userId: 1)
            );
        }

        [Fact]
        public async Task DeleteQuestionAsync_DeletedQuestionNotReturnedInList()
        {
            // After deletion, the question should not appear in GetMyQuestionsAsync
            var q = await CreateQuestion("Deleted Q", QuestionType.Text, userId: 1);

            await _questionBankService.DeleteQuestionAsync(q.Id, userId: 1);

            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 1, isAdmin: false,
                new GetQuestionBankRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(0, result.TotalCount);
            Assert.Empty(result.Questions);
        }

        [Fact]
        public async Task DeleteQuestionAsync_OtherUsersQuestionsUnaffected()
        {
            // Deleting user 1's question should not affect user 2's questions
            var q1 = await CreateQuestion("User1 Q", QuestionType.Text, userId: 1);
            await CreateQuestion("User2 Q", QuestionType.Text, userId: 2);

            await _questionBankService.DeleteQuestionAsync(q1.Id, userId: 1);

            var result = await _questionBankService.GetMyQuestionsAsync(
                userId: 2, isAdmin: false,
                new GetQuestionBankRequestDto { PageNumber = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("User2 Q", result.Questions[0].Text);
        }
    }
}
