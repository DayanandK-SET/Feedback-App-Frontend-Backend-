namespace Feedback_Generation_App.Models.DTOs
{
    public class GetAuditLogsRequestDto
    {
        public int PageNumber { get; set; } = 1;
        public int PageSize   { get; set; } = 8;

        /// <summary>Free-text search across Action, SurveyTitle, PerformedBy.</summary>
        public string? Search { get; set; }

        public DateTime? FromDate { get; set; }
        public DateTime? ToDate   { get; set; }
    }
}
