using System.Text.Json;

namespace CCSUMeerut.Recruitment.Api.Infrastructure;

public static class JsonRequestHelper
{
    public static T DeserializeNestedOrSelf<T>(JsonElement body, string propertyName)
        where T : new()
    {
        if (body.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return new T();
        }

        if (body.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in body.EnumerateObject())
            {
                if (!string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return property.Value.Deserialize<T>(JsonDefaults.Options) ?? new T();
            }
        }

        return body.Deserialize<T>(JsonDefaults.Options) ?? new T();
    }

    public static T DeserializeRequiredNestedOrSelf<T>(JsonElement body, string propertyName)
        where T : new()
    {
        if (body.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid request payload.");
        }

        return DeserializeNestedOrSelf<T>(body, propertyName);
    }
}
