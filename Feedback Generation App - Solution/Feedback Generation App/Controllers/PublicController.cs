using Feedback_Generation_App.Interfaces;
using Feedback_Generation_App.Models.DTOs;
using Feedback_Generation_App.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
public class PublicController : ControllerBase
{
    private readonly IPublicSurveyService _service;
    private readonly IRepository<int, Feedback_Generation_App.Models.Survey> _surveyRepository;

    public PublicController(
        IPublicSurveyService service,
        IRepository<int, Feedback_Generation_App.Models.Survey> surveyRepository)
    {
        _service = service;
        _surveyRepository = surveyRepository;
    }

    /// <summary>Returns whether a survey is private (no auth needed).</summary>
    [HttpGet("{publicIdentifier}/is-private")]
    public async Task<IActionResult> CheckIsPrivate(string publicIdentifier)
    {
        var survey = await _surveyRepository.GetQueryable()
            .FirstOrDefaultAsync(s =>
                s.PublicIdentifier == publicIdentifier &&
                s.IsActive &&
                !s.IsDeleted);

        if (survey == null)
            return NotFound(new { message = "Survey not found or inactive" });

        return Ok(new { isPrivate = survey.IsPrivate, surveyId = survey.Id });
    }

    [HttpGet("{publicIdentifier}")]
    public async Task<IActionResult> GetSurvey(string publicIdentifier)
    {
        var survey = await _service.GetSurvey(publicIdentifier);

        if (survey == null)
            return NotFound("Survey not found or inactive");

        return Ok(survey);
    }

    [HttpPost("{publicIdentifier}/submit")]
    public async Task<IActionResult> SubmitSurvey(string publicIdentifier, SubmitSurveyDto dto)
    {
        try
        {
            await _service.SubmitSurvey(publicIdentifier, dto);
            return Ok(new { message = "Survey submitted successfully" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}