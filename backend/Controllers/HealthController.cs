using CCSUMeerut.Recruitment.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace CCSUMeerut.Recruitment.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<HealthResponseDto> Get()
    {
        return Ok(new HealthResponseDto
        {
            Ok = true,
            Message = "Recruitment portal API is running.",
        });
    }
}
