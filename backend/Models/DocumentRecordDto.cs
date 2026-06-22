namespace CCSUMeerut.Recruitment.Api.Models;

public class DocumentRecordDto
{
    public string OriginalName { get; set; } = string.Empty;

    public string StoredName { get; set; } = string.Empty;

    public long Size { get; set; }

    public string Mimetype { get; set; } = string.Empty;

    public string UploadedAt { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;
}
