using System.Text.Json;
using CCSUMeerut.Recruitment.Api.Models;
using CCSUMeerut.Recruitment.Api.Infrastructure;

namespace CCSUMeerut.Recruitment.Api.Middleware;

public class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ApiExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ApiException exception)
        {
            await WriteErrorAsync(context, exception.StatusCode, exception.Message);
        }
        catch (BadHttpRequestException exception)
        {
            await WriteErrorAsync(
                context,
                exception.StatusCode > 0
                    ? exception.StatusCode
                    : StatusCodes.Status400BadRequest,
                exception.StatusCode == StatusCodes.Status413PayloadTooLarge
                    ? "Request payload is too large."
                    : "Invalid request payload.");
        }
        catch (JsonException)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status400BadRequest,
                "Invalid request payload.");
        }
        catch (Exception exception)
        {
            var fullError = exception.ToString();
            Console.WriteLine($"[CRITICAL ERROR] {fullError}");
            await WriteErrorAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "Unexpected backend error.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(
            new MessageResponseDto
            {
                Message = message,
            },
            cancellationToken: context.RequestAborted);
    }
}
