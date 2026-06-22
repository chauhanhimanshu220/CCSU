using System.Threading.Tasks;

namespace CCSUMeerut.Recruitment.Api.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
}
