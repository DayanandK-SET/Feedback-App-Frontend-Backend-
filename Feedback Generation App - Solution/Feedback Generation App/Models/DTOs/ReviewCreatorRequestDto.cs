using System.ComponentModel.DataAnnotations;

namespace Feedback_Generation_App.Models.DTOs
{
    public class ReviewCreatorRequestDto
    {
        [Required]
        public bool Approve { get; set; }
    }
}
