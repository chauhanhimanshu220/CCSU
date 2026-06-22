namespace CCSUMeerut.Recruitment.Api.Entities;

public class RecruitmentDetailsRecord
{
    public int Id { get; set; }
    public int ApplicantId { get; set; }
    
    public string AdvertisementNumber { get; set; } = string.Empty;
    public string PostAppliedFor { get; set; } = string.Empty;

    // Navigation property
    public virtual ApplicantRecord Applicant { get; set; } = null!;
}
