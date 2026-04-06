using Feedback_Generation_App.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Feedback_Generation_App.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "User")]
    public class UserController : ControllerBase
    {
        private readonly ICreatorRequestService _creatorRequestService;

        public UserController(ICreatorRequestService creatorRequestService)
        {
            _creatorRequestService = creatorRequestService;
        }

        /// <summary>
        /// User submits a request to become a Creator.
        /// POST /api/user/request-creator-role
        /// </summary>
        [HttpPost("request-creator-role")]
        public async Task<IActionResult> RequestCreatorRole()
        {
            var userId = int.Parse(
                User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            await _creatorRequestService.SubmitRequestAsync(userId);

            return Ok(new { Message = "Your request to become a Creator has been submitted. Please wait for admin approval." });
        }
    }
}
