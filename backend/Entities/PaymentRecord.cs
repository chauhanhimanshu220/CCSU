namespace CCSUMeerut.Recruitment.Api.Entities;

public class PaymentRecord
{
    public int Id { get; set; }
    public int ApplicantId { get; set; }
    
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PayerName { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string PaidAt { get; set; } = string.Empty;

    // Navigation property
    public virtual ApplicantRecord Applicant { get; set; } = null!;
}
