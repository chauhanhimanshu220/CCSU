using CCSUMeerut.Recruitment.Api.Models;

namespace CCSUMeerut.Recruitment.Api.Services;

public interface IFileStorageService
{
    Task DeleteStoredUploadAsync(DocumentRecordDto? documentRecord, CancellationToken cancellationToken);

    Task<DocumentRecordDto> SaveUploadAsync(IFormFile file, CancellationToken cancellationToken);
}
