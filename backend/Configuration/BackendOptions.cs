namespace CCSUMeerut.Recruitment.Api.Configuration;

public class BackendOptions
{
    public const string SectionName = "Backend";

    public int Port { get; set; } = 4000;

    public string UploadsPath { get; set; } = "uploads";

    public string[] AllowedOrigins { get; set; } =
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ];
}
