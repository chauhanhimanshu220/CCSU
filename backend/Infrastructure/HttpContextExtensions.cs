using CCSUMeerut.Recruitment.Api.Models;

namespace CCSUMeerut.Recruitment.Api.Infrastructure;

public static class HttpContextExtensions
{
    public static ApplicantDto GetCurrentApplicant(this HttpContext httpContext)
    {
        if (httpContext.Items.TryGetValue(HttpContextItemKeys.CurrentApplicant, out var value) &&
            value is ApplicantDto applicant)
        {
            return applicant;
        }

        throw new InvalidOperationException("Current applicant was not available on the request.");
    }

    public static string GetAuthToken(this HttpContext httpContext)
    {
        if (httpContext.Items.TryGetValue(HttpContextItemKeys.AuthToken, out var value) &&
            value is string token)
        {
            return token;
        }

        throw new InvalidOperationException("Authentication token was not available on the request.");
    }
}
