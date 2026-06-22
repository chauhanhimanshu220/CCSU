using System.ComponentModel.DataAnnotations;

namespace CCSUMeerut.Recruitment.Api.Models;

public class LoginRequestDto
{
    [Required]
    public string LoginId { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
