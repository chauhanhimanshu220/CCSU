namespace CCSUMeerut.Recruitment.Api.Models;

public class VerifyOtpRequestDto
{
    public string Identifier { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}
