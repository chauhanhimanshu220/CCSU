using System.ComponentModel.DataAnnotations;

namespace CCSUMeerut.Recruitment.Api.Models;

public class PaymentRequestDto
{
    [Required]
    public string PaymentMethod { get; set; } = string.Empty;

    [Required]
    public string PayerName { get; set; } = string.Empty;
}
