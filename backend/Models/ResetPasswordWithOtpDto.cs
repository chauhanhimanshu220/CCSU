namespace CCSUMeerut.Recruitment.Api.Models;

public class ResetPasswordWithOtpDto
{
    public string Identifier { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
