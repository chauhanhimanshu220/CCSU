namespace CCSUMeerut.Recruitment.Api.Models;

public class LoginApplicantResult
{
    public string Token { get; set; } = string.Empty;

    public ApplicantDto Applicant { get; set; } = new();
}
