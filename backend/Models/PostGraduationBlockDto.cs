namespace CCSUMeerut.Recruitment.Api.Models;

public class PostGraduationBlockDto
{
    public bool Enabled { get; set; }

    public string University { get; set; } = string.Empty;

    public string Course { get; set; } = string.Empty;

    public string PassingYear { get; set; } = string.Empty;

    public string MarksObtained { get; set; } = string.Empty;

    public string MaxMarks { get; set; } = string.Empty;
}
