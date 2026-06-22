using CCSUMeerut.Recruitment.Api.Models;

namespace CCSUMeerut.Recruitment.Api.Services;

public interface IApplicantService
{
    Task<RegisterApplicantResult> CreateApplicantAsync(PersonalDetailsInputDto personalInput, CancellationToken cancellationToken);

    Task<bool> IsMobileNumberRegisteredAsync(string mobileNumber, CancellationToken cancellationToken);
    Task<bool> IsAadhaarNumberRegisteredAsync(string aadhaarNumber, CancellationToken cancellationToken);

    Task<ApplicantDto> DeleteDocumentAsync(int recordId, string field, CancellationToken cancellationToken);

    Task<ApplicantDto> CompletePaymentAsync(int recordId, PaymentRequestDto paymentInput, CancellationToken cancellationToken);

    Task<ApplicantDto?> GetApplicantByTokenAsync(string token, CancellationToken cancellationToken);

    Task<LoginApplicantResult> LoginApplicantAsync(string loginId, string password, CancellationToken cancellationToken);

    Task LogoutApplicantAsync(string token, CancellationToken cancellationToken);

    Task<ApplicantDto> SaveDocumentAsync(int recordId, string field, IFormFile file, CancellationToken cancellationToken);

    Task<ApplicantDto> SubmitApplicationAsync(int recordId, CancellationToken cancellationToken);

    Task<ApplicantDto> UpdateRecruitmentDetailsAsync(
        int recordId,
        RecruitmentDetailsDto recruitmentInput,
        CancellationToken cancellationToken);

    Task<ApplicantDto> UpdateEducationDetailsAsync(int recordId, EducationDetailsDto educationInput, CancellationToken cancellationToken);

    Task<ApplicantDto> UpdatePreviousServiceDetailsAsync(int recordId, PreviousServiceDetailsDto serviceInput, CancellationToken cancellationToken);

    Task<ApplicantDto> UpdatePersonalDetailsAsync(int recordId, PersonalDetailsInputDto personalInput, CancellationToken cancellationToken);

    Task ResetPasswordAsync(ResetPasswordRequestDto request, CancellationToken cancellationToken);

    Task VerifyResetDetailsAsync(string registrationNumber, string mobileNumber, CancellationToken cancellationToken);
    Task SendResetPasswordOtpAsync(string identifier, CancellationToken cancellationToken);
    Task<bool> VerifyResetPasswordOtpAsync(string identifier, string otp, CancellationToken cancellationToken);
    Task ResetPasswordWithOtpAsync(ResetPasswordWithOtpDto request, CancellationToken cancellationToken);
}
