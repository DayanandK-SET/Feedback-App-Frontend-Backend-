using Feedback_Generation_App.Exceptions;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models;
using Feedback_Generation_App.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Feedback_Generation_App.Services
{
    public class CreatorRequestService : ICreatorRequestService
    {
        private readonly IRepository<int, CreatorRequest> _requestRepository;
        private readonly IRepository<int, User> _userRepository;

        public CreatorRequestService(
            IRepository<int, CreatorRequest> requestRepository,
            IRepository<int, User> userRepository)
        {
            _requestRepository = requestRepository;
            _userRepository = userRepository;
        }

        public async Task SubmitRequestAsync(int userId)
        {
            var user = await _userRepository.GetQueryable()
                .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

            if (user == null)
                throw new NotFoundException("User not found");

            if (user.Role == "Creator" || user.Role == "Admin")
                throw new BadRequestException("You are already a Creator or Admin");

            // Prevent duplicate pending requests
            var existing = await _requestRepository.GetQueryable()
                .AnyAsync(r =>
                    r.UserId == userId &&
                    r.Status == CreatorRequestStatus.Pending &&
                    !r.IsDeleted);

            if (existing)
                throw new BadRequestException("You already have a pending request");

            await _requestRepository.AddAsync(new CreatorRequest
            {
                UserId = userId,
                Status = CreatorRequestStatus.Pending,
                RequestedAt = DateTime.UtcNow
            });
        }

        public async Task ReviewRequestAsync(int requestId, ReviewCreatorRequestDto dto)
        {
            var request = await _requestRepository.GetQueryable()
                .FirstOrDefaultAsync(r => r.Id == requestId && !r.IsDeleted);

            if (request == null)
                throw new NotFoundException("Creator request not found");

            if (request.Status != CreatorRequestStatus.Pending)
                throw new BadRequestException("Request has already been reviewed");

            request.Status = dto.Approve
                ? CreatorRequestStatus.Approved
                : CreatorRequestStatus.Rejected;

            request.ReviewedAt = DateTime.UtcNow;

            await _requestRepository.UpdateAsync(requestId, request);

            // If approved, upgrade user role to Creator
            if (dto.Approve)
            {
                var user = await _userRepository.GetQueryable()
                    .FirstOrDefaultAsync(u => u.Id == request.UserId && !u.IsDeleted);

                if (user == null)
                    throw new NotFoundException("User not found");

                user.Role = "Creator";
                await _userRepository.UpdateAsync(user.Id, user);
            }
        }

        public async Task<List<CreatorRequestDto>> GetPendingRequestsAsync()
        {
            return await _requestRepository.GetQueryable()
                .Where(r => r.Status == CreatorRequestStatus.Pending && !r.IsDeleted)
                .Include(r => r.User)
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => new CreatorRequestDto
                {
                    Id = r.Id,
                    UserId = r.UserId,
                    Username = r.User != null ? r.User.Username : string.Empty,
                    Email = r.User != null ? r.User.Email : string.Empty,
                    Status = r.Status.ToString(),
                    RequestedAt = r.RequestedAt,
                    ReviewedAt = r.ReviewedAt
                })
                .ToListAsync();
        }

        public async Task<List<CreatorRequestDto>> GetAllRequestsAsync()
        {
            return await _requestRepository.GetQueryable()
                .Where(r => !r.IsDeleted)
                .Include(r => r.User)
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => new CreatorRequestDto
                {
                    Id = r.Id,
                    UserId = r.UserId,
                    Username = r.User != null ? r.User.Username : string.Empty,
                    Email = r.User != null ? r.User.Email : string.Empty,
                    Status = r.Status.ToString(),
                    RequestedAt = r.RequestedAt,
                    ReviewedAt = r.ReviewedAt
                })
                .ToListAsync();
        }
    }
}
