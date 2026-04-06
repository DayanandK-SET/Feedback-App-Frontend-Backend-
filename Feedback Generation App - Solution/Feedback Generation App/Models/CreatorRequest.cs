namespace Feedback_Generation_App.Models
{
    public enum CreatorRequestStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }

    public class CreatorRequest : BaseEntity
    {
        public int UserId { get; set; }
        public User? User { get; set; }

        public CreatorRequestStatus Status { get; set; } = CreatorRequestStatus.Pending;

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
    }
}
