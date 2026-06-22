namespace CCSUMeerut.Recruitment.Api.Models;

public class DocumentChecklistItemDto
{
    public string Key { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public bool Required { get; set; }

    public bool Uploaded { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public string UploadedAt { get; set; } = string.Empty;
}
