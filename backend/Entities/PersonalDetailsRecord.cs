namespace CCSUMeerut.Recruitment.Api.Entities;

public class PersonalDetailsRecord
{
    public int Id { get; set; }
    public int ApplicantId { get; set; }
    
    public string Name { get; set; } = string.Empty;
    public string FatherName { get; set; } = string.Empty;
    public string MotherName { get; set; } = string.Empty;
    public string AadhaarNumber { get; set; } = string.Empty;
    public string DateOfBirth { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string AlternateMobileNumber { get; set; } = string.Empty;
    public string EmailAddress { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public string Nationality { get; set; } = "Indian";
    public string Category { get; set; } = string.Empty;
    public string IsUpDomicile { get; set; } = string.Empty;
    public string PersonWithDisability { get; set; } = "No";
    public string IsEws { get; set; } = "No";
    public string DomicileCertificateNumber { get; set; } = string.Empty;
    public string DomicileState { get; set; } = string.Empty;

    // Address fields
    public string CorrespondenceAddressLine1 { get; set; } = string.Empty;
    public string CorrespondenceAddressLine2 { get; set; } = string.Empty;
    public string CorrespondenceCity { get; set; } = string.Empty;
    public string CorrespondenceState { get; set; } = string.Empty;
    public string CorrespondenceDistrict { get; set; } = string.Empty;
    public string CorrespondencePinCode { get; set; } = string.Empty;

    public string PermanentAddressLine1 { get; set; } = string.Empty;
    public string PermanentAddressLine2 { get; set; } = string.Empty;
    public string PermanentCity { get; set; } = string.Empty;
    public string PermanentState { get; set; } = string.Empty;
    public string PermanentDistrict { get; set; } = string.Empty;
    public string PermanentPinCode { get; set; } = string.Empty;

    // Navigation property
    public virtual ApplicantRecord Applicant { get; set; } = null!;
}
