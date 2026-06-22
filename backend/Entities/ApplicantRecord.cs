using System.Collections.Generic;

namespace CCSUMeerut.Recruitment.Api.Entities;

public class ApplicantRecord
{
    public int Id { get; set; }

    public string LoginId { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string? SessionToken { get; set; }

    public string PaymentStatus { get; set; } = "pending";

    public string ApplicationStatus { get; set; } = "draft";

    public string CurrentStep { get; set; } = "personal";

    public string CreatedAt { get; set; } = string.Empty;

    public string UpdatedAt { get; set; } = string.Empty;

    public string? SubmittedAt { get; set; }
    public string? ResetOtp { get; set; }
    public DateTime? ResetOtpExpiry { get; set; }

    // Navigation Properties (Normalized)
    public virtual PersonalDetailsRecord? PersonalDetails { get; set; }
    public virtual RecruitmentDetailsRecord? RecruitmentDetails { get; set; }
    public virtual ICollection<EducationRecord> EducationRecords { get; set; } = new List<EducationRecord>();
    public virtual ICollection<ExperienceRecord> ExperienceRecords { get; set; } = new List<ExperienceRecord>();
    public virtual ICollection<DocumentRecord> DocumentRecords { get; set; } = new List<DocumentRecord>();
    public virtual ICollection<PaymentRecord> PaymentRecords { get; set; } = new List<PaymentRecord>();
}
