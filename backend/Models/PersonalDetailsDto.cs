using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CCSUMeerut.Recruitment.Api.Models;

public class PersonalDetailsDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("fullName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? FullNameLegacy
    {
        get => null;
        set
        {
            if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(Name))
            {
                Name = value;
            }
        }
    }

    [Required]
    public string FatherName { get; set; } = string.Empty;

    [Required]
    public string MotherName { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{12}$")]
    public string AadhaarNumber { get; set; } = string.Empty;

    [Required]
    public string DateOfBirth { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{10}$")]
    public string MobileNumber { get; set; } = string.Empty;

    public string AlternateMobileNumber { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string EmailAddress { get; set; } = string.Empty;

    [Required]
    public string Gender { get; set; } = string.Empty;

    public string Nationality { get; set; } = "Indian";

    [Required]
    public string Category { get; set; } = string.Empty;

    public string IsUpDomicile { get; set; } = string.Empty;

    public string PersonWithDisability { get; set; } = "No";

    public string IsEws { get; set; } = "No";

    public string DomicileCertificateNumber { get; set; } = string.Empty;

    [Required]
    public string DomicileState { get; set; } = string.Empty;

    public string CorrespondenceAddress { get; set; } = string.Empty;

    public string CorrespondencePinCode { get; set; } = string.Empty;

    public string CorrespondenceState { get; set; } = string.Empty;

    public string CorrespondenceDistrict { get; set; } = string.Empty;

    public bool SameAsCorrespondence { get; set; }

    public string PermanentAddress { get; set; } = string.Empty;

    public string PermanentPinCode { get; set; } = string.Empty;

    public string PermanentState { get; set; } = string.Empty;

    public string PermanentDistrict { get; set; } = string.Empty;
    public string CorrespondenceAddressLine1 { get; set; } = string.Empty;
    public string CorrespondenceAddressLine2 { get; set; } = string.Empty;
    public string PermanentAddressLine1 { get; set; } = string.Empty;
    public string PermanentAddressLine2 { get; set; } = string.Empty;

    [Required]
    public string AddressLine1 { get; set; } = string.Empty;

    public string AddressLine2 { get; set; } = string.Empty;

    [Required]
    public string City { get; set; } = string.Empty;

    [Required]
    public string State { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$")]
    public string PinCode { get; set; } = string.Empty;

    public string CorrespondenceCity { get; set; } = string.Empty;
    public string PermanentCity { get; set; } = string.Empty;
}
