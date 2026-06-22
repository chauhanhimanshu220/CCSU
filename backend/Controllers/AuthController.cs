using System.Text.Json;
using CCSUMeerut.Recruitment.Api.Authentication;
using CCSUMeerut.Recruitment.Api.Infrastructure;
using CCSUMeerut.Recruitment.Api.Models;
using CCSUMeerut.Recruitment.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CCSUMeerut.Recruitment.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IApplicantService _applicantService;

    public AuthController(IApplicantService applicantService)
    {
        _applicantService = applicantService;
    }

    [HttpGet("mobile-number-availability")]
    public async Task<ActionResult<MobileNumberAvailabilityResponseDto>> CheckMobileNumberAvailability(
        [FromQuery] string mobileNumber,
        CancellationToken cancellationToken)
    {
        var isRegistered = await _applicantService.IsMobileNumberRegisteredAsync(mobileNumber, cancellationToken);

        return Ok(new MobileNumberAvailabilityResponseDto
        {
            IsRegistered = isRegistered,
            Message = isRegistered
                ? "This mobile number is already registered."
                : "Mobile number is available.",
        });
    }

    [HttpGet("aadhaar-number-availability")]
    public async Task<ActionResult<AadhaarNumberAvailabilityResponseDto>> CheckAadhaarNumberAvailability(
        [FromQuery] string aadhaarNumber,
        CancellationToken cancellationToken)
    {
        var isRegistered = await _applicantService.IsAadhaarNumberRegisteredAsync(aadhaarNumber, cancellationToken);

        return Ok(new AadhaarNumberAvailabilityResponseDto
        {
            IsRegistered = isRegistered,
            Message = isRegistered
                ? "This Aadhaar number is already registered."
                : "Aadhaar number is available.",
        });
    }

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponseDto>> Register(
        [FromBody] JsonElement body,
        CancellationToken cancellationToken)
    {
        var personalDetails = JsonRequestHelper.DeserializeRequiredNestedOrSelf<PersonalDetailsInputDto>(
            body,
            "personalDetails");
        var result = await _applicantService.CreateApplicantAsync(personalDetails, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new RegisterResponseDto
        {
            Message = "Registration created successfully.",
            Token = result.Token,
            Credentials = new CredentialsDto
            {
                LoginId = result.Applicant.LoginId,
                Password = result.Password,
            },
            Applicant = result.Applicant,
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login(
        [FromBody] LoginRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid request payload.");
        }

        var result = await _applicantService.LoginApplicantAsync(
            request.LoginId,
            request.Password,
            cancellationToken);

        return Ok(new LoginResponseDto
        {
            Message = "Login successful.",
            Token = result.Token,
            Applicant = result.Applicant,
        });
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<MessageResponseDto>> ResetPassword(
        [FromBody] ResetPasswordRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid request payload.");
        }

        await _applicantService.ResetPasswordAsync(request, cancellationToken);

        return Ok(new MessageResponseDto
        {
            Message = "Password reset successfully.",
        });
    }

    [HttpPost("verify-reset-details")]
    public async Task<ActionResult<MessageResponseDto>> VerifyResetDetails(
        [FromBody] VerifyResetDetailsRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid request payload.");
        }

        await _applicantService.VerifyResetDetailsAsync(request.RegistrationNumber, request.MobileNumber, cancellationToken);

        return Ok(new MessageResponseDto
        {
            Message = "Details verified successfully.",
        });
    }

    [HttpPost("forgot-password-otp")]
    public async Task<ActionResult<MessageResponseDto>> SendForgotPasswordOtp(
        [FromBody] ForgotPasswordOtpRequestDto request,
        CancellationToken cancellationToken)
    {
        await _applicantService.SendResetPasswordOtpAsync(request.Identifier, cancellationToken);

        return Ok(new MessageResponseDto
        {
            Message = "OTP has been sent to your registered email address.",
        });
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<MessageResponseDto>> VerifyOtp(
        [FromBody] VerifyOtpRequestDto request,
        CancellationToken cancellationToken)
    {
        await _applicantService.VerifyResetPasswordOtpAsync(request.Identifier, request.Otp, cancellationToken);

        return Ok(new MessageResponseDto
        {
            Message = "OTP verified successfully.",
        });
    }

    [HttpPost("reset-password-with-otp")]
    public async Task<ActionResult<MessageResponseDto>> ResetPasswordWithOtp(
        [FromBody] ResetPasswordWithOtpDto request,
        CancellationToken cancellationToken)
    {
        await _applicantService.ResetPasswordWithOtpAsync(request, cancellationToken);

        return Ok(new MessageResponseDto
        {
            Message = "Password reset successfully.",
        });
    }

    [Authorize(AuthenticationSchemes = ApplicantSessionAuthenticationHandler.SchemeName)]
    [HttpPost("logout")]
    public async Task<ActionResult<MessageResponseDto>> Logout(CancellationToken cancellationToken)
    {
        await _applicantService.LogoutApplicantAsync(HttpContext.GetAuthToken(), cancellationToken);

        return Ok(new MessageResponseDto
        {
            Message = "Logged out successfully.",
        });
    }
}
