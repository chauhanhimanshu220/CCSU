using System.Text.Json;
using CCSUMeerut.Recruitment.Api.Authentication;
using CCSUMeerut.Recruitment.Api.Infrastructure;
using CCSUMeerut.Recruitment.Api.Models;
using CCSUMeerut.Recruitment.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CCSUMeerut.Recruitment.Api.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = ApplicantSessionAuthenticationHandler.SchemeName)]
[Route("api/applicant")]
public class ApplicantController : ControllerBase
{
    private readonly IApplicantService _applicantService;

    public ApplicantController(IApplicantService applicantService)
    {
        _applicantService = applicantService;
    }

    [HttpGet("me")]
    public ActionResult<CurrentApplicantResponseDto> GetCurrentApplicant()
    {
        return Ok(new CurrentApplicantResponseDto
        {
            Applicant = HttpContext.GetCurrentApplicant(),
        });
    }

    [HttpPut("personal")]
    public async Task<ActionResult<ApplicantResponseDto>> UpdatePersonalDetails(
        [FromBody] JsonElement body,
        CancellationToken cancellationToken)
    {
        var personalDetails = JsonRequestHelper.DeserializeRequiredNestedOrSelf<PersonalDetailsInputDto>(
            body,
            "personalDetails");
        var applicant = await _applicantService.UpdatePersonalDetailsAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            personalDetails,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Personal details saved successfully.",
            Applicant = applicant,
        });
    }

    [HttpPut("recruitment")]
    public async Task<ActionResult<ApplicantResponseDto>> UpdateRecruitmentDetails(
        [FromBody] JsonElement body,
        CancellationToken cancellationToken)
    {
        var recruitmentDetails = JsonRequestHelper.DeserializeRequiredNestedOrSelf<RecruitmentDetailsDto>(
            body,
            "recruitmentDetails");
        var applicant = await _applicantService.UpdateRecruitmentDetailsAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            recruitmentDetails,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Recruitment details saved successfully.",
            Applicant = applicant,
        });
    }

    [HttpPut("education")]
    public async Task<ActionResult<ApplicantResponseDto>> UpdateEducationDetails(
        [FromBody] JsonElement body,
        CancellationToken cancellationToken)
    {
        var educationDetails = JsonRequestHelper.DeserializeRequiredNestedOrSelf<EducationDetailsDto>(
            body,
            "educationDetails");
        var applicant = await _applicantService.UpdateEducationDetailsAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            educationDetails,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Educational details saved successfully.",
            Applicant = applicant,
        });
    }

    [HttpPut("service")]
    public async Task<ActionResult<ApplicantResponseDto>> UpdatePreviousServiceDetails(
        [FromBody] JsonElement body,
        CancellationToken cancellationToken)
    {
        var serviceDetails = JsonRequestHelper.DeserializeRequiredNestedOrSelf<PreviousServiceDetailsDto>(
            body,
            "previousServiceDetails");
        var applicant = await _applicantService.UpdatePreviousServiceDetailsAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            serviceDetails,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Previous service details saved successfully.",
            Applicant = applicant,
        });
    }

    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)]
    [HttpPost("documents/{field}")]
    public async Task<ActionResult<ApplicantResponseDto>> UploadDocument(
        [FromRoute] string field,
        [FromForm(Name = "file")] IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Please choose a file to upload.");
        }

        var applicant = await _applicantService.SaveDocumentAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            field,
            file,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Document uploaded successfully.",
            Applicant = applicant,
        });
    }

    [HttpDelete("documents/{field}")]
    public async Task<ActionResult<ApplicantResponseDto>> DeleteDocument(
        [FromRoute] string field,
        CancellationToken cancellationToken)
    {
        var applicant = await _applicantService.DeleteDocumentAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            field,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Document removed successfully.",
            Applicant = applicant,
        });
    }

    [HttpPost("payment")]
    public async Task<ActionResult<ApplicantResponseDto>> CompletePayment(
        [FromBody] PaymentRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid request payload.");
        }

        var applicant = await _applicantService.CompletePaymentAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            request,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Payment completed successfully.",
            Applicant = applicant,
        });
    }

    [HttpPost("submit")]
    public async Task<ActionResult<ApplicantResponseDto>> SubmitApplication(CancellationToken cancellationToken)
    {
        var applicant = await _applicantService.SubmitApplicationAsync(
            HttpContext.GetCurrentApplicant().RecordId,
            cancellationToken);

        return Ok(new ApplicantResponseDto
        {
            Message = "Application submitted successfully.",
            Applicant = applicant,
        });
    }
}
