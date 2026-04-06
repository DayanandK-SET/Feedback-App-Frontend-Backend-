using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedback_Generation_App.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly ICreatorRequestService _creatorRequestService;

        public AdminController(
            IAdminService adminService,
            ICreatorRequestService creatorRequestService)
        {
            _adminService = adminService;
            _creatorRequestService = creatorRequestService;
        }

        // ── Existing GET endpoints — NOT touched ──────────────────

        [HttpGet("creators")]
        public async Task<IActionResult> GetAllCreators()
        {
            var creators = await _adminService.GetAllCreatorsAsync();
            return Ok(creators);
        }

        [HttpGet("surveys")]
        public async Task<IActionResult> GetAllSurveys()
        {
            var surveys = await _adminService.GetAllSurveysAsync();
            return Ok(surveys);
        }

        [HttpDelete("survey/{id}")]
        public async Task<IActionResult> DeleteSurvey(int id)
        {
            await _adminService.DeleteSurveyAsync(id);
            return Ok(new { message = "Survey Deleted successfully" });
        }

        [HttpPatch("creator/{id}/toggle-status")]
        public async Task<IActionResult> ToggleCreatorStatus(int id)
        {
            await _adminService.ToggleCreatorStatusAsync(id);
            return Ok(new { Message = "Creator status updated successfully" });
        }

        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs()
        {
            var logs = await _adminService.GetAuditLogsAsync();
            return Ok(logs);
        }

        // ── NEW: paged + filtered endpoints ──────────────────────

        // POST /api/Admin/creators/search
        [HttpPost("creators/search")]
        public async Task<IActionResult> SearchCreators(
            [FromBody] GetAdminCreatorsRequestDto request)
        {
            var result = await _adminService.SearchCreatorsAsync(request);
            return Ok(result);
        }

        // POST /api/Admin/surveys/search
        [HttpPost("surveys/search")]
        public async Task<IActionResult> SearchSurveys(
            [FromBody] GetAdminSurveysRequestDto request)
        {
            var result = await _adminService.SearchSurveysAsync(request);
            return Ok(result);
        }

        // POST /api/Admin/audit-logs/search
        [HttpPost("audit-logs/search")]
        public async Task<IActionResult> SearchAuditLogs(
            [FromBody] GetAuditLogsRequestDto request)
        {
            var result = await _adminService.SearchAuditLogsAsync(request);
            return Ok(result);
        }

        // ── Creator Requests ──────────────────────────────────────

        // GET /api/Admin/creator-requests/pending
        [HttpGet("creator-requests/pending")]
        public async Task<IActionResult> GetPendingCreatorRequests()
        {
            var result = await _creatorRequestService.GetPendingRequestsAsync();
            return Ok(result);
        }

        // GET /api/Admin/creator-requests
        [HttpGet("creator-requests")]
        public async Task<IActionResult> GetAllCreatorRequests()
        {
            var result = await _creatorRequestService.GetAllRequestsAsync();
            return Ok(result);
        }

        // PATCH /api/Admin/creator-requests/{id}/review
        [HttpPatch("creator-requests/{id}/review")]
        public async Task<IActionResult> ReviewCreatorRequest(
            int id, [FromBody] ReviewCreatorRequestDto dto)
        {
            await _creatorRequestService.ReviewRequestAsync(id, dto);
            return Ok(new { Message = dto.Approve ? "Creator request approved" : "Creator request rejected" });
        }
    }
}
