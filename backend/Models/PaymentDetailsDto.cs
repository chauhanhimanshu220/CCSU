namespace CCSUMeerut.Recruitment.Api.Models;

public class PaymentDetailsDto
{
    public int Amount { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public string PayerName { get; set; } = string.Empty;

    public string TransactionId { get; set; } = string.Empty;

    public string PaidAt { get; set; } = string.Empty;
}
