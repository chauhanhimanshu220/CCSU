using System.ComponentModel.DataAnnotations;

namespace CCSUMeerut.Recruitment.Api.Models;

public class RecruitmentDetailsDto
{
    [Required]
    public string AdvertisementNumber { get; set; } = string.Empty;

    [Required]
    public string PostAppliedFor { get; set; } = string.Empty;
}
