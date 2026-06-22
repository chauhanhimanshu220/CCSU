using CCSUMeerut.Recruitment.Api.Authentication;
using CCSUMeerut.Recruitment.Api.Configuration;
using CCSUMeerut.Recruitment.Api.Data;
using CCSUMeerut.Recruitment.Api.Middleware;
using CCSUMeerut.Recruitment.Api.Repositories;
using CCSUMeerut.Recruitment.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
var backendOptions = builder.Configuration
    .GetSection(BackendOptions.SectionName)
    .Get<BackendOptions>() ?? new BackendOptions();

builder.WebHost.UseUrls($"http://localhost:{backendOptions.Port}");

var uploadsAbsolutePath = Path.GetFullPath(
    backendOptions.UploadsPath,
    builder.Environment.ContentRootPath);

Directory.CreateDirectory(uploadsAbsolutePath);
Directory.CreateDirectory(uploadsAbsolutePath);

builder.Services.Configure<BackendOptions>(
    builder.Configuration.GetSection(BackendOptions.SectionName));

builder.Services.Configure<SmtpOptions>(
    builder.Configuration.GetSection("SmtpSettings"));

builder.Services.AddDbContext<RecruitmentDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure();
            sqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        }));

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(backendOptions.AllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services
    .AddAuthentication(ApplicantSessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, ApplicantSessionAuthenticationHandler>(
        ApplicantSessionAuthenticationHandler.SchemeName,
        _ => { });

builder.Services.AddAuthorization();
builder.Services.AddHttpClient();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

builder.Services.AddScoped<IApplicantRepository, ApplicantRepository>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IApplicantService, ApplicantService>();

var app = builder.Build();

app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate";
    context.Response.Headers.Pragma = "no-cache";
    context.Response.Headers.Expires = "0";
    if (!context.Request.Path.StartsWithSegments("/uploads"))
    {
        context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
    }
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "no-referrer-when-downgrade";
    await next();
});

app.UseMiddleware<ApiExceptionMiddleware>();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<RecruitmentDbContext>();
    await dbContext.Database.MigrateAsync();

    // Migration from SQLite is no longer supported in this version due to schema normalization.
}

app.UseCors("Frontend");

// Matches Express static file hosting at /uploads.
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsAbsolutePath),
    RequestPath = "/uploads",
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
