using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Feedback_Generation_App.Services
{
    public class QuestionBankService
    {
        private readonly IRepository<int, QuestionBank> _questionBankRepository;

        public QuestionBankService(IRepository<int, QuestionBank> questionBankRepository)
        {
            _questionBankRepository = questionBankRepository;
        }

        // ── Create ────────────────────────────────────────────────────────────

        public async Task<List<int>> CreateQuestionsAsync(
            List<CreateQuestionBankDto> dtos, int userId)
        {
            if (dtos == null || !dtos.Any())
                throw new BadRequestException("At least one question is required.");

            var createdIds = new List<int>();

            foreach (var dto in dtos)
            {
                if (string.IsNullOrWhiteSpace(dto.Text))
                    throw new BadRequestException("Question text is required.");

                var question = new QuestionBank
                {
                    Text        = dto.Text,
                    QuestionType = dto.QuestionType,
                    CreatedById = userId,
                    CreatedAt   = DateTime.UtcNow
                };

                if (dto.Options != null && dto.Options.Any())
                {
                    question.Options = dto.Options
                        .Select(o => new QuestionBankOption { OptionText = o })
                        .ToList();
                }

                await _questionBankRepository.AddAsync(question);
                createdIds.Add(question.Id);
            }

            return createdIds;
        }

        //  Read 

        public async Task<QuestionBankPagedResponseDto> GetMyQuestionsAsync(
            int userId, bool isAdmin, GetQuestionBankRequestDto request)
        {
            if (request.PageNumber < 1) request.PageNumber = 1;
            if (request.PageSize  < 1) request.PageSize   = 10;

            var query = _questionBankRepository.GetQueryable()
                .Where(q => !q.IsDeleted)
                .Include(q => q.Options)
                .AsQueryable();

            // Admin sees all questions; Creator sees only their own
            if (!isAdmin)
                query = query.Where(q => q.CreatedById == userId);

            if (request.QuestionType.HasValue)
                query = query.Where(q => q.QuestionType == request.QuestionType.Value);

            var totalCount = await query.CountAsync();

            var questions = await query
                .OrderByDescending(q => q.CreatedAt)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(q => new QuestionBankResponseDto
                {
                    Id           = q.Id,
                    Text         = q.Text,
                    QuestionType = q.QuestionType,
                    Options      = q.Options!.Select(o => o.OptionText).ToList(),
                    CreatedById  = q.CreatedById
                })
                .ToListAsync();

            return new QuestionBankPagedResponseDto
            {
                TotalCount = totalCount,
                PageNumber = request.PageNumber,
                PageSize   = request.PageSize,
                Questions  = questions
            };
        }

        // ── Update 
        // Only the creator who owns the question can edit it.
        // Admin role is intentionally excluded — view only.

        public async Task UpdateQuestionAsync(
            int questionId, int userId, UpdateQuestionBankDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Text))
                throw new BadRequestException("Question text is required.");

            var question = await _questionBankRepository.GetQueryable()
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == questionId && !q.IsDeleted);

            if (question == null)
                throw new NotFoundException("Question not found.");

            // Ownership check — only the creator can edit
            if (question.CreatedById != userId)
                throw new ForbiddenException("You can only edit your own questions.");

            question.Text      = dto.Text.Trim();
            question.UpdatedAt = DateTime.UtcNow;

            // Replace options for MultipleChoice questions
            if (question.QuestionType == QuestionType.MultipleChoice)
            {
                var validOptions = dto.Options?
                    .Where(o => !string.IsNullOrWhiteSpace(o))
                    .ToList() ?? new List<string>();

                if (validOptions.Count < 2)
                    throw new BadRequestException(
                        "Multiple choice questions require at least 2 options.");

                question.Options = validOptions
                    .Select(o => new QuestionBankOption { OptionText = o.Trim() })
                    .ToList();
            }

            await _questionBankRepository.UpdateAsync(questionId, question);
        }

        // ── Delete ────────────────────────────────────────────────────────────
        // Soft-delete. Only the creator who owns the question can delete it.
        // Admin role is intentionally excluded — view only.

        public async Task DeleteQuestionAsync(int questionId, int userId)
        {
            var question = await _questionBankRepository.GetQueryable()
                .FirstOrDefaultAsync(q => q.Id == questionId && !q.IsDeleted);

            if (question == null)
                throw new NotFoundException("Question not found.");

            // Ownership check — only the creator can delete
            if (question.CreatedById != userId)
                throw new ForbiddenException("You can only delete your own questions.");

            question.IsDeleted = true;
            await _questionBankRepository.UpdateAsync(questionId, question);
        }
    }
}
