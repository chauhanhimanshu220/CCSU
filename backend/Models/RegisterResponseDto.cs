namespace CCSUMeerut.Recruitment.Api.Models;

public class RegisterResponseDto : MessageResponseDto
{
    public string Token { get; set; } = string.Empty;

    public CredentialsDto Credentials { get; set; } = new();

    public ApplicantDto Applicant { get; set; } = new();
}
