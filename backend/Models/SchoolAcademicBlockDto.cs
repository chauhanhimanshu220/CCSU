using System.ComponentModel.DataAnnotations;

namespace CCSUMeerut.Recruitment.Api.Models;

public class SchoolAcademicBlockDto
{
    [Required]
    public string Board { get; set; } = string.Empty;

    [Required]
    public string PassingYear { get; set; } = string.Empty;

    [Required]
    public string MarksObtained { get; set; } = string.Empty;

    [Required]
    public string MaxMarks { get; set; } = string.Empty;
}
