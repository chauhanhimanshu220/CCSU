namespace CCSUMeerut.Recruitment.Api.Entities;

public class ExperienceRecord
{
    public int Id { get; set; }
    public int ApplicantId { get; set; }
    
    public string OrganizationName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string NatureOfEmployment { get; set; } = string.Empty;
    public string DateOfJoining { get; set; } = string.Empty;
    public string DateOfRelieving { get; set; } = string.Empty;
    public string TotalExperience { get; set; } = string.Empty;

    // Navigation property
    public virtual ApplicantRecord Applicant { get; set; } = null!;
}
