using Feedback_Generation_App.Models.DTOs;

namespace Feedback_Generation_App.Interfaces
{
    public interface ICreatorRequestService
    {
        /// <summary>User submits a request to become a Creator.</summary>
        Task SubmitRequestAsync(int userId);

        /// <summary>Admin reviews (approve/reject) a creator request.</summary>
        Task ReviewRequestAsync(int requestId, ReviewCreatorRequestDto dto);

        /// <summary>Admin gets all pending creator requests.</summary>
        Task<List<CreatorRequestDto>> GetPendingRequestsAsync();

        /// <summary>Admin gets all creator requests (all statuses).</summary>
        Task<List<CreatorRequestDto>> GetAllRequestsAsync();
    }
}
