using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CCSUMeerut.Recruitment.Api.Models;

public class PersonalDetailsInputDto
{
    public string? Name { get; set; }

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

    public string? FatherName { get; set; }

    public string? MotherName { get; set; }

    public string? AadhaarNumber { get; set; }

    public string? DateOfBirth { get; set; }

    [RegularExpression(@"^\d{10}$")]
    public string? MobileNumber { get; set; }

    [RegularExpression(@"^\d{10}$")]
    public string? AlternateMobileNumber { get; set; }

    [EmailAddress]
    public string? EmailAddress { get; set; }

    public string? Gender { get; set; }

    public string? Nationality { get; set; }

    public string? Category { get; set; }

    public string? IsUpDomicile { get; set; }

    public string? PersonWithDisability { get; set; }

    public string? IsEws { get; set; }

    public string? DomicileCertificateNumber { get; set; }

    public string? DomicileState { get; set; }

    public string? CorrespondenceAddress { get; set; }

    [RegularExpression(@"^\d{6}$")]
    public string? CorrespondencePinCode { get; set; }

    public string? CorrespondenceState { get; set; }

    public string? CorrespondenceDistrict { get; set; }

    public bool? SameAsCorrespondence { get; set; }

    public string? PermanentAddress { get; set; }

    [RegularExpression(@"^\d{6}$")]
    public string? PermanentPinCode { get; set; }

    public string? PermanentState { get; set; }

    public string? PermanentDistrict { get; set; }
    public string? CorrespondenceAddressLine1 { get; set; }
    public string? CorrespondenceAddressLine2 { get; set; }
    public string? PermanentAddressLine1 { get; set; }
    public string? PermanentAddressLine2 { get; set; }

    public string? AddressLine1 { get; set; }

    public string? AddressLine2 { get; set; }

    public string? City { get; set; }

    public string? State { get; set; }

    [RegularExpression(@"^\d{6}$")]
    public string? PinCode { get; set; }

    public string? CorrespondenceCity { get; set; }
    public string? PermanentCity { get; set; }
}
