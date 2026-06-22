namespace CCSUMeerut.Recruitment.Api.Models;

public class PreviousServiceDetailsDto
{
    public string RegistrationType { get; set; } = string.Empty;

    public List<PreviousServiceEntryDto> Experiences { get; set; } = [];
}
