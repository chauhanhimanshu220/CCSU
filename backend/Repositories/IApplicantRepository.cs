using CCSUMeerut.Recruitment.Api.Entities;

namespace CCSUMeerut.Recruitment.Api.Repositories;

public interface IApplicantRepository
{
    Task AddAsync(ApplicantRecord applicant, CancellationToken cancellationToken);

    Task<ApplicantRecord?> FindByIdAsync(int id, CancellationToken cancellationToken, bool asNoTracking = false);

    Task<ApplicantRecord?> FindByLoginIdAsync(string loginId, CancellationToken cancellationToken, bool asNoTracking = false);

    Task<ApplicantRecord?> FindByMobileNumberAsync(
        string mobileNumber,
        CancellationToken cancellationToken,
        bool asNoTracking = false);

    Task<ApplicantRecord?> FindByAadhaarNumberAsync(
        string aadhaarNumber,
        CancellationToken cancellationToken,
        bool asNoTracking = false);

    Task<ApplicantRecord?> FindBySessionTokenAsync(string token, CancellationToken cancellationToken, bool asNoTracking = false);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
