namespace Feedback_Generation_App.Models.DTOs
{
    public class UpdateQuestionBankDto
    {
        public string Text { get; set; } = string.Empty;
        public List<string>? Options { get; set; }
    }
}
