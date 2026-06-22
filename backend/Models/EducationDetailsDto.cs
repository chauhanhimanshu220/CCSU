using System.ComponentModel.DataAnnotations;

namespace CCSUMeerut.Recruitment.Api.Models;

public class EducationDetailsDto
{
    [Required]
    public SchoolAcademicBlockDto HighSchool { get; set; } = new();

    [Required]
    public SchoolAcademicBlockDto Intermediate { get; set; } = new();

    public GraduationAcademicBlockDto Graduation { get; set; } = new();

    public PostGraduationBlockDto PostGraduation { get; set; } = new();

    [Required]
    public PreviousServiceDetailsDto PreviousServiceDetails { get; set; } = new();

    public string AdditionalQualification { get; set; } = string.Empty;
}
