namespace CCSUMeerut.Recruitment.Api.Models;

public class ApplicantDto
{
    public int RecordId { get; set; }

    public string LoginId { get; set; } = string.Empty;

    public PersonalDetailsDto PersonalDetails { get; set; } = new();

    public RecruitmentDetailsDto RecruitmentDetails { get; set; } = new();

    public EducationDetailsDto EducationDetails { get; set; } = new();

    public Dictionary<string, DocumentRecordDto> Documents { get; set; } = new();

    public List<DocumentChecklistItemDto> DocumentChecklist { get; set; } = [];

    public string PaymentStatus { get; set; } = "pending";

    public PaymentDetailsDto PaymentDetails { get; set; } = new();

    public string ApplicationStatus { get; set; } = "draft";

    public string CurrentStep { get; set; } = "personal";

    public string ResumeStep { get; set; } = "personal";

    public CompletionStatusDto Completion { get; set; } = new();

    public int FeeAmount { get; set; }

    public string CreatedAt { get; set; } = string.Empty;

    public string UpdatedAt { get; set; } = string.Empty;

    public string? SubmittedAt { get; set; }
}
