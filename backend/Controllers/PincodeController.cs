using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;
using CCSUMeerut.Recruitment.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace CCSUMeerut.Recruitment.Api.Controllers;

[ApiController]
[Route("api/pincode")]
public class PincodeController : ControllerBase
{
    private static readonly Regex IndianPincodePattern = new("^[1-9][0-9]{5}$", RegexOptions.Compiled);
    private static readonly ConcurrentDictionary<string, PincodeLocation> Cache = new(StringComparer.Ordinal);

    private readonly IHttpClientFactory _httpClientFactory;

    public PincodeController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("{pinCode}")]
    public async Task<ActionResult<object>> Lookup([FromRoute] string pinCode, CancellationToken cancellationToken)
    {
        var normalizedPinCode = new string((pinCode ?? string.Empty).Where(char.IsDigit).ToArray());

        if (!IndianPincodePattern.IsMatch(normalizedPinCode))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Please enter a valid 6-digit Indian PIN code.");
        }

        if (Cache.TryGetValue(normalizedPinCode, out var cachedLocation))
        {
            return Ok(new
            {
                pinCode = normalizedPinCode,
                state = cachedLocation.State,
                district = cachedLocation.District,
            });
        }

        var httpClient = _httpClientFactory.CreateClient();
        using var response = await httpClient.GetAsync(
            $"https://api.postalpincode.in/pincode/{normalizedPinCode}",
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException(StatusCodes.Status502BadGateway, "PIN code lookup service is unavailable right now.");
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(responseStream, cancellationToken: cancellationToken);
        var location = TryGetLocation(document.RootElement);

        if (location is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "No location found for this PIN code.");
        }

        Cache[normalizedPinCode] = location.Value;

        return Ok(new
        {
            pinCode = normalizedPinCode,
            state = location.Value.State,
            district = location.Value.District,
        });
    }

    private static PincodeLocation? TryGetLocation(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
        {
            return null;
        }

        var firstResult = root[0];
        if (!firstResult.TryGetProperty("Status", out var statusElement) ||
            !string.Equals(statusElement.GetString(), "Success", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (!firstResult.TryGetProperty("PostOffice", out var postOffices) ||
            postOffices.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var rankedLocations = new Dictionary<string, RankedLocation>(StringComparer.Ordinal);

        foreach (var postOffice in postOffices.EnumerateArray())
        {
            var state = ReadFirstNonEmptyString(postOffice, "State", "Circle");
            var district = ReadFirstNonEmptyString(postOffice, "District", "Block", "Division");

            if (string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(district))
            {
                continue;
            }

            var key = $"{state}|||{district}";
            if (rankedLocations.TryGetValue(key, out var rankedLocation))
            {
                rankedLocations[key] = rankedLocation with
                {
                    Count = rankedLocation.Count + 1,
                };
            }
            else
            {
                rankedLocations[key] = new RankedLocation(state, district, 1);
            }
        }

        var bestLocation = rankedLocations.Values
            .OrderByDescending(location => location.Count)
            .ThenBy(location => location.District, StringComparer.Ordinal)
            .ThenBy(location => location.State, StringComparer.Ordinal)
            .FirstOrDefault();

        if (bestLocation is not null)
        {
            return new PincodeLocation(bestLocation.State, bestLocation.District);
        }

        foreach (var postOffice in postOffices.EnumerateArray())
        {
            var fallbackState = ReadFirstNonEmptyString(postOffice, "State", "Circle");
            var fallbackDistrict = ReadFirstNonEmptyString(postOffice, "District", "Block", "Division");

            if (string.IsNullOrWhiteSpace(fallbackState) || string.IsNullOrWhiteSpace(fallbackDistrict))
            {
                continue;
            }

            return new PincodeLocation(fallbackState, fallbackDistrict);
        }

        return null;
    }

    private static string ReadFirstNonEmptyString(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!element.TryGetProperty(propertyName, out var propertyValue) ||
                propertyValue.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var value = propertyValue.GetString()?.Trim() ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private sealed record RankedLocation(string State, string District, int Count);

    private readonly record struct PincodeLocation(string State, string District);
}
