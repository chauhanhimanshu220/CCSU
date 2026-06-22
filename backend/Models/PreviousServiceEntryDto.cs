using System.Text.Json.Serialization;

namespace CCSUMeerut.Recruitment.Api.Models;

public class PreviousServiceEntryDto
{
    public string OrganizationName { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string Designation { get; set; } = string.Empty;

    public string NatureOfEmployment { get; set; } = string.Empty;

    public string DateOfJoining { get; set; } = string.Empty;

    public string DateOfRelieving { get; set; } = string.Empty;

    [JsonPropertyName("dateOfLeaving")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DateOfLeavingLegacy
    {
        get => null;
        set
        {
            if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(DateOfRelieving))
            {
                DateOfRelieving = value;
            }
        }
    }

    public string TotalExperience { get; set; } = string.Empty;
}
