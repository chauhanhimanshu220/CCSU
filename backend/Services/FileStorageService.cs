using System.Security.Cryptography;
using CCSUMeerut.Recruitment.Api.Configuration;
using CCSUMeerut.Recruitment.Api.Infrastructure;
using CCSUMeerut.Recruitment.Api.Models;
using Microsoft.Extensions.Options;

namespace CCSUMeerut.Recruitment.Api.Services;

public class FileStorageService : IFileStorageService
{
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    };

    private readonly string _uploadsDirectory;

    public FileStorageService(IOptions<BackendOptions> options, IWebHostEnvironment environment)
    {
        _uploadsDirectory = Path.GetFullPath(
            options.Value.UploadsPath,
            environment.ContentRootPath);

        Directory.CreateDirectory(_uploadsDirectory);
    }

    public async Task<DocumentRecordDto> SaveUploadAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length > 5 * 1024 * 1024)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "File size must be 5 MB or smaller.");
        }

        if (!AllowedMimeTypes.Contains(file.ContentType))
        {
            throw new ApiException(
                StatusCodes.Status400BadRequest,
                "Only PDF, JPG, PNG, and WEBP files are allowed.");
        }

        var extension = Path.GetExtension(file.FileName);
        var storedName =
            $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant()}{extension}";
        var absolutePath = Path.Combine(_uploadsDirectory, storedName);

        await using (var stream = File.Create(absolutePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return new DocumentRecordDto
        {
            OriginalName = file.FileName,
            StoredName = storedName,
            Size = file.Length,
            Mimetype = file.ContentType,
            UploadedAt = DateTimeOffset.UtcNow.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"),
            Url = $"/uploads/{Uri.EscapeDataString(storedName)}",
        };
    }

    public Task DeleteStoredUploadAsync(DocumentRecordDto? documentRecord, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var storedName = documentRecord?.StoredName;
        if (string.IsNullOrWhiteSpace(storedName))
        {
            return Task.CompletedTask;
        }

        try
        {
            var absolutePath = Path.Combine(_uploadsDirectory, Path.GetFileName(storedName));
            if (File.Exists(absolutePath))
            {
                File.Delete(absolutePath);
            }
        }
        catch
        {
            // Intentionally ignored to match the Node implementation's best-effort unlink behavior.
        }

        return Task.CompletedTask;
    }
}
