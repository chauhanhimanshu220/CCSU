using CCSUMeerut.Recruitment.Api.Data;
using CCSUMeerut.Recruitment.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CCSUMeerut.Recruitment.Api.Repositories;

public class ApplicantRepository : IApplicantRepository
{
    private readonly RecruitmentDbContext _dbContext;

    public ApplicantRepository(RecruitmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(ApplicantRecord applicant, CancellationToken cancellationToken)
    {
        return _dbContext.Applicants.AddAsync(applicant, cancellationToken).AsTask();
    }

    public Task<ApplicantRecord?> FindByIdAsync(
        int id,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        var query = asNoTracking
            ? _dbContext.Applicants.AsNoTracking()
            : _dbContext.Applicants.AsQueryable();

        return query
            .Include(a => a.PersonalDetails)
            .Include(a => a.RecruitmentDetails)
            .Include(a => a.EducationRecords)
            .Include(a => a.ExperienceRecords)
            .Include(a => a.DocumentRecords)
            .Include(a => a.PaymentRecords)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public Task<ApplicantRecord?> FindByLoginIdAsync(
        string loginId,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        var query = asNoTracking
            ? _dbContext.Applicants.AsNoTracking()
            : _dbContext.Applicants.AsQueryable();

        return query
            .Include(a => a.PersonalDetails)
            .Include(a => a.RecruitmentDetails)
            .Include(a => a.EducationRecords)
            .Include(a => a.ExperienceRecords)
            .Include(a => a.DocumentRecords)
            .Include(a => a.PaymentRecords)
            .FirstOrDefaultAsync(item => item.LoginId == loginId, cancellationToken);
    }

    public Task<ApplicantRecord?> FindByMobileNumberAsync(
        string mobileNumber,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        var query = _dbContext.Applicants.AsQueryable();

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return query
            .Include(a => a.PersonalDetails)
            .FirstOrDefaultAsync(a => a.PersonalDetails != null && a.PersonalDetails.MobileNumber == mobileNumber, cancellationToken);
    }

    public Task<ApplicantRecord?> FindByAadhaarNumberAsync(
        string aadhaarNumber,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        var query = _dbContext.Applicants.AsQueryable();

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return query
            .Include(a => a.PersonalDetails)
            .FirstOrDefaultAsync(a => a.PersonalDetails != null && a.PersonalDetails.AadhaarNumber == aadhaarNumber, cancellationToken);
    }

    public Task<ApplicantRecord?> FindBySessionTokenAsync(
        string token,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        var query = asNoTracking
            ? _dbContext.Applicants.AsNoTracking()
            : _dbContext.Applicants.AsQueryable();

        return query
            .Include(a => a.PersonalDetails)
            .Include(a => a.RecruitmentDetails)
            .Include(a => a.EducationRecords)
            .Include(a => a.ExperienceRecords)
            .Include(a => a.DocumentRecords)
            .Include(a => a.PaymentRecords)
            .FirstOrDefaultAsync(item => item.SessionToken == token, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
