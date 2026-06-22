using System.Globalization;
using System.Security.Claims;
using System.Text.Encodings.Web;
using CCSUMeerut.Recruitment.Api.Infrastructure;
using CCSUMeerut.Recruitment.Api.Models;
using CCSUMeerut.Recruitment.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace CCSUMeerut.Recruitment.Api.Authentication;

public class ApplicantSessionAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "ApplicantSession";

    private readonly IApplicantService _applicantService;

    public ApplicantSessionAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IApplicantService applicantService)
        : base(options, logger, encoder)
    {
        _applicantService = applicantService;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var headerValue))
        {
            Context.Items[HttpContextItemKeys.AuthErrorMessage] = "Authentication is required.";
            return AuthenticateResult.NoResult();
        }

        var authorizationHeader = headerValue.ToString();
        if (string.IsNullOrWhiteSpace(authorizationHeader) ||
            !authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            Context.Items[HttpContextItemKeys.AuthErrorMessage] = "Authentication is required.";
            return AuthenticateResult.NoResult();
        }

        var token = authorizationHeader["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            Context.Items[HttpContextItemKeys.AuthErrorMessage] = "Authentication is required.";
            return AuthenticateResult.NoResult();
        }

        var applicant = await _applicantService.GetApplicantByTokenAsync(token, Context.RequestAborted);
        if (applicant is null)
        {
            Context.Items[HttpContextItemKeys.AuthErrorMessage] = "Session expired. Please login again.";
            return AuthenticateResult.Fail("Session expired. Please login again.");
        }

        Context.Items[HttpContextItemKeys.AuthToken] = token;
        Context.Items[HttpContextItemKeys.CurrentApplicant] = applicant;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, applicant.RecordId.ToString(CultureInfo.InvariantCulture)),
            new Claim("loginId", applicant.LoginId),
        };

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return AuthenticateResult.Success(ticket);
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.ContentType = "application/json";

        var message = Context.Items[HttpContextItemKeys.AuthErrorMessage] as string
            ?? "Authentication is required.";

        return Response.WriteAsJsonAsync(
            new MessageResponseDto
            {
                Message = message,
            },
            cancellationToken: Context.RequestAborted);
    }
}
