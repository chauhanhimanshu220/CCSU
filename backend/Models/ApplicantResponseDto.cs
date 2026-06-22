namespace CCSUMeerut.Recruitment.Api.Models;

public class ApplicantResponseDto : MessageResponseDto
{
    public ApplicantDto Applicant { get; set; } = new();
}
