namespace CCSUMeerut.Recruitment.Api.Models;

public sealed class VerifyResetDetailsRequestDto
{
    public string RegistrationNumber { get; init; } = string.Empty;

    public string MobileNumber { get; init; } = string.Empty;
}
