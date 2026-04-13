using Azure.Core;
using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[Route("api/[controller]")]
[ApiController]
public class SurveyController : ControllerBase
{
    private readonly ISurveyService _surveyService;
    
private readonly IConfiguration _configuration;


    public SurveyController(ISurveyService surveyService, IConfiguration configuration)
    {
        _surveyService = surveyService;
        
    _configuration = configuration;

    }

    [Authorize(Roles = "Creator,Admin")]
    [HttpPost]
    public async Task<IActionResult> CreateSurvey(CreateSurveyDto dto)
    {
        int userId = int.Parse(
            User.FindFirst(ClaimTypes.NameIdentifier)!.Value
        );

        var publicId = await _surveyService.CreateSurvey(dto, userId);



        var frontendBaseUrl = _configuration["Frontend:BaseUrl"];



        return Ok(new
{
    Message = "Survey created successfully",
    PublicLink = $"{frontendBaseUrl}/survey/{publicId}"
});

    }


    [HttpGet("{id}/responses")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> GetSurveyResponses(
        int id,
        [FromQuery] GetSurveyResponsesRequestDto request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

        var userId = int.Parse(userIdClaim.Value);

        var result = await _surveyService
            .GetSurveyResponsesAsync(id, userId, request);

        return Ok(result);
    }


    [Authorize(Roles = "Creator,Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSurvey(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

        var userId = int.Parse(userIdClaim.Value);

        await _surveyService.DeleteSurveyAsync(id, userId);

        return Ok(new { Message = "Survey deleted successfully" });
    }

    [Authorize(Roles = "Creator,Admin")]
    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleSurveyStatus(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

        var userId = int.Parse(userIdClaim.Value);

        await _surveyService.ToggleSurveyStatusAsync(id, userId);

        return Ok(new { Message = "Survey status updated successfully" });
    }


    [Authorize(Roles = "Creator,Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSurvey(int id, UpdateSurveyDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

        var userId = int.Parse(userIdClaim.Value);

        await _surveyService.UpdateSurveyAsync(id, userId, dto);

        return Ok(new { Message = "Survey updated successfully" });
    }

    [Authorize(Roles = "Creator,Admin")]
    [HttpPost("my-surveys/search")]
    public async Task<IActionResult> GetMySurveys(
    [FromBody] GetMySurveysRequestDto request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        var userId = int.Parse(userIdClaim!.Value);
        var result = await _surveyService.GetCreatorSurveysAsync(userId, request);
        return Ok(result);
    }


    [Authorize(Roles = "Creator,Admin")]
    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetSurveyAnalytics(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

        var userId = int.Parse(userIdClaim.Value);

        var result = await _surveyService.GetSurveyAnalyticsAsync(id, userId);

        return Ok(result);
    }


    [HttpGet("{surveyId}/export-responses")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> ExportResponses(int surveyId)
    {
        var userId = int.Parse(
            User.FindFirst(ClaimTypes.NameIdentifier)!.Value
        );

        var file = await _surveyService
            .ExportResponsesToExcelAsync(surveyId, userId);

        return File(
            file,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Survey_{surveyId}_Responses.xlsx"
        );
    }


    [HttpPost("import-excel")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> ImportSurveyFromExcel(
    [FromForm] ImportSurveyExcelDto dto)
    {
        var userId = int.Parse(
            User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var surveyId = await _surveyService
            .ImportSurveyFromExcelAsync(dto, userId);

        return Ok(new
        {
            Message = "Survey created from Excel successfully",
            SurveyIdentifier = surveyId
        });
    }



    [Authorize(Roles = "Creator,Admin")]
    [HttpGet("{id}/response-trend")]
    public async Task<IActionResult> GetResponseTrend(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        var userId = int.Parse(userIdClaim.Value);

        var result = await _surveyService.GetSurveyResponseTrendAsync(id, userId);

        return Ok(result);
    }

    [Authorize(Roles = "Creator,Admin")]
    [HttpPost("{id}/send-analytics-email")]
    public async Task<IActionResult> SendAnalyticsEmail(int id, [FromBody] SendAnalyticsEmailDto? dto)
    {
        var userId = int.Parse(
            User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        await _surveyService.SendAnalyticsEmailAsync(id, userId, dto?.Email, dto?.HtmlBody);

        return Ok(new { Message = "Analytics report sent successfully." });
    }
}
