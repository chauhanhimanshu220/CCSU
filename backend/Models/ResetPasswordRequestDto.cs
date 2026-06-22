namespace CCSUMeerut.Recruitment.Api.Models;

public sealed class ResetPasswordRequestDto
{
    public string RegistrationNumber { get; init; } = string.Empty;

    public string MobileNumber { get; init; } = string.Empty;

    public string NewPassword { get; init; } = string.Empty;

    public string ConfirmPassword { get; init; } = string.Empty;
}
