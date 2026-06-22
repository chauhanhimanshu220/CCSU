namespace CCSUMeerut.Recruitment.Api.Models;

public class RegisterApplicantResult
{
    public string Token { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public ApplicantDto Applicant { get; set; } = new();
}
