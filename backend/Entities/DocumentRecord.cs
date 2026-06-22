namespace CCSUMeerut.Recruitment.Api.Entities;

public class DocumentRecord
{
    public int Id { get; set; }
    public int ApplicantId { get; set; }
    
    public string DocumentKey { get; set; } = string.Empty; // passportPhoto, signature, etc.
    public string OriginalName { get; set; } = string.Empty;
    public string StoredName { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Mimetype { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string UploadedAt { get; set; } = string.Empty;

    // Navigation property
    public virtual ApplicantRecord Applicant { get; set; } = null!;
}
