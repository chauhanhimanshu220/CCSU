namespace CCSUMeerut.Recruitment.Api.Entities;

public class EducationRecord
{
    public int Id { get; set; }
    public int ApplicantId { get; set; }
    
    public string Level { get; set; } = string.Empty; // HighSchool, Intermediate, etc.
    public string DegreeName { get; set; } = string.Empty;
    public string BoardUniversity { get; set; } = string.Empty;
    public string PassingYear { get; set; } = string.Empty;
    public string MarksObtained { get; set; } = string.Empty;
    public string MaxMarks { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;

    // Navigation property
    public virtual ApplicantRecord Applicant { get; set; } = null!;
}
