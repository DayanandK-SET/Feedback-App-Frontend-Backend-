using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Helpers;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Feedback_Generation_App.Services
{
    public class PrivateSurveyService : IPrivateSurveyService
    {
        private readonly IRepository<int, Survey> _surveyRepository;
        private readonly IRepository<int, SurveyParticipant> _participantRepository;
        private readonly IEmailService _emailService;

        public PrivateSurveyService(
            IRepository<int, Survey> surveyRepository,
            IRepository<int, SurveyParticipant> participantRepository,
            IEmailService emailService)
        {
            _surveyRepository    = surveyRepository;
            _participantRepository = participantRepository;
            _emailService        = emailService;
        }

        public async Task AddParticipantsAsync(
            int surveyId, int creatorId, AddParticipantsDto dto)
        {
            var survey = await _surveyRepository.GetQueryable()
                .FirstOrDefaultAsync(s => s.Id == surveyId && !s.IsDeleted);

            if (survey == null)
                throw new NotFoundException("Survey not found");

            if (survey.CreatedById != creatorId)
                throw new ForbiddenException("You do not own this survey");

            if (!survey.IsPrivate)
                throw new BadRequestException("Survey is not private");

            if (dto.Emails == null || !dto.Emails.Any())
                throw new BadRequestException("At least one email is required");

            // Normalise
            var distinctEmails = dto.Emails
                .Select(e => e.Trim().ToLowerInvariant())
                .Where(e => e.Length > 0)
                .Distinct()
                .ToList();

            // Validate all emails upfront using the shared helper — reject the whole batch if any are invalid
            var invalidEmails = distinctEmails.Where(e => !EmailHelper.IsValidEmail(e)).ToList();
            if (invalidEmails.Any())
                throw new BadRequestException(
                    $"Invalid email address(es): {string.Join(", ", invalidEmails)}");

            var surveyLink = $"http://localhost:4200/survey/{survey.PublicIdentifier}/verify";

            foreach (var email in distinctEmails)
            {
                // Skip duplicates already in the DB
                var exists = await _participantRepository.GetQueryable()
                    .AnyAsync(p => p.SurveyId == surveyId && p.Email == email && !p.IsDeleted);

                if (exists) continue;

                await _participantRepository.AddAsync(new SurveyParticipant
                {
                    SurveyId = surveyId,
                    Email    = email
                });

                // Send the invitation HTML built by the frontend
                if (!string.IsNullOrWhiteSpace(dto.InvitationHtmlBody))
                {
                    try
                    {
                        var subject = $"You're invited to complete a survey: \"{survey.Title}\"";
                        await _emailService.SendEmailAsync(email, subject, dto.InvitationHtmlBody, isHtml: true);
                    }
                    catch
                    {
                        // Don't block the operation if one email fails
                    }
                }
            }
        }

        public async Task SendOtpAsync(SendOtpDto dto)
        {
            var survey = await _surveyRepository.GetQueryable()
                .FirstOrDefaultAsync(s => s.Id == dto.SurveyId && !s.IsDeleted && s.IsActive);

            if (survey == null)
                throw new NotFoundException("Survey not found or inactive");

            if (!survey.IsPrivate)
                throw new BadRequestException("Survey is not private");

            var participant = await _participantRepository.GetQueryable()
                .FirstOrDefaultAsync(p =>
                    p.SurveyId == dto.SurveyId &&
                    p.Email    == dto.Email &&
                    !p.IsDeleted);

            if (participant == null)
                throw new ForbiddenException("You are not invited to this survey");

            if (participant.IsCompleted)
                throw new BadRequestException("You have already completed this survey");

            // Generate 6-digit OTP
            var otp = new Random().Next(100000, 999999).ToString();

            participant.OTP       = otp;
            participant.OTPExpiry = DateTime.UtcNow.AddMinutes(10);
            participant.IsVerified = false;

            await _participantRepository.UpdateAsync(participant.Id, participant);

            var subject = "Your Survey OTP";
            var body    = $"Your OTP to access the survey \"{survey.Title}\" is: {otp}\n\n" +
                          "This OTP is valid for 10 minutes. Do not share it with anyone.";

            await _emailService.SendEmailAsync(dto.Email, subject, body);
        }

        public async Task VerifyOtpAsync(VerifyOtpDto dto)
        {
            var participant = await _participantRepository.GetQueryable()
                .FirstOrDefaultAsync(p =>
                    p.SurveyId == dto.SurveyId &&
                    p.Email    == dto.Email &&
                    !p.IsDeleted);

            if (participant == null)
                throw new ForbiddenException("You are not invited to this survey");

            if (string.IsNullOrEmpty(participant.OTP))
                throw new BadRequestException("No OTP has been sent. Please request one first");

            if (participant.OTPExpiry.HasValue && participant.OTPExpiry.Value < DateTime.UtcNow)
                throw new BadRequestException("OTP has expired. Please request a new one");

            if (participant.OTP != dto.OTP)
                throw new BadRequestException("Invalid OTP");

            participant.IsVerified = true;
            participant.OTP        = null;
            participant.OTPExpiry  = null;

            await _participantRepository.UpdateAsync(participant.Id, participant);
        }

        public async Task<PublicSurveyDto> GetPrivateSurveyAsync(int surveyId, string email)
        {
            var participant = await _participantRepository.GetQueryable()
                .FirstOrDefaultAsync(p =>
                    p.SurveyId == surveyId &&
                    p.Email    == email &&
                    !p.IsDeleted);

            if (participant == null)
                throw new ForbiddenException("You are not invited to this survey");

            if (!participant.IsVerified)
                throw new ForbiddenException("OTP verification required before accessing this survey");

            var survey = await _surveyRepository.GetQueryable()
                .Include(s => s.Questions!)
                    .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(s =>
                    s.Id       == surveyId &&
                    s.IsActive &&
                    s.IsPrivate &&
                    !s.IsDeleted);

            if (survey == null)
                throw new NotFoundException("Survey not found or inactive");

            if (survey.ExpireAt.HasValue && survey.ExpireAt.Value < DateTime.UtcNow)
                throw new BadRequestException("This survey has expired");

            return new PublicSurveyDto
            {
                Title       = survey.Title,
                Description = survey.Description,
                Questions   = survey.Questions!.Select(q => new PublicQuestionDto
                {
                    QuestionId   = q.Id,
                    Text         = q.Text,
                    QuestionType = q.QuestionType,
                    Options      = q.Options?.Select(o => new PublicOptionDto
                    {
                        OptionId   = o.Id,
                        OptionText = o.OptionText
                    }).ToList()
                }).ToList()
            };
        }
    }
}
