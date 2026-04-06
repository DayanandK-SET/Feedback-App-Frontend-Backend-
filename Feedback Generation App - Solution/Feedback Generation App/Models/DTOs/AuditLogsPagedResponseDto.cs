namespace Feedback_Generation_App.Models.DTOs
{
    public class AuditLogsPagedResponseDto
    {
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize   { get; set; }
        public List<AuditLogDto> Logs { get; set; } = new();
    }
}
