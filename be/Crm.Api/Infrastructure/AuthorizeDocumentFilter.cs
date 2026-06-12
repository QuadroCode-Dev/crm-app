using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Net.Http;

namespace Crm.Api.Infrastructure;

public sealed class AuthorizeDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        foreach (var apiDescription in context.ApiDescriptions)
        {
            if (!TryGetOperation(swaggerDoc, apiDescription, out var operation))
            {
                continue;
            }

            var endpointMetadata = apiDescription.ActionDescriptor.EndpointMetadata;

            var hasAllowAnonymous = endpointMetadata
                .OfType<AllowAnonymousAttribute>()
                .Any();

            if (hasAllowAnonymous)
            {
                operation.Security = null;
                continue;
            }

            var isControllerAction = apiDescription.ActionDescriptor.RouteValues.ContainsKey("controller");
            var hasAuthorizeMetadata = endpointMetadata.OfType<AuthorizeAttribute>().Any();

            if (!isControllerAction && !hasAuthorizeMetadata)
            {
                continue;
            }

            operation.Security ??= new List<OpenApiSecurityRequirement>();
            operation.Security.Clear();
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecuritySchemeReference("Bearer", swaggerDoc, null),
                    new List<string>()
                }
            });
        }
    }

    private static bool TryGetOperation(
        OpenApiDocument swaggerDoc,
        ApiDescription apiDescription,
        out OpenApiOperation operation)
    {
        operation = default!;

        if (string.IsNullOrWhiteSpace(apiDescription.RelativePath))
        {
            return false;
        }

        var pathKey = "/" + apiDescription.RelativePath.TrimStart('/');
        if (!swaggerDoc.Paths.TryGetValue(pathKey, out var pathItem) || pathItem is null)
        {
            return false;
        }

        var operationType = apiDescription.HttpMethod?.ToUpperInvariant() switch
        {
            "GET" => HttpMethod.Get,
            "POST" => HttpMethod.Post,
            "PUT" => HttpMethod.Put,
            "PATCH" => HttpMethod.Patch,
            "DELETE" => HttpMethod.Delete,
            "HEAD" => HttpMethod.Head,
            "OPTIONS" => HttpMethod.Options,
            "TRACE" => HttpMethod.Trace,
            _ => null
        };

        if (operationType is null)
        {
            return false;
        }

        var operations = pathItem.Operations;
        if (operations is null)
        {
            return false;
        }

        if (!operations.TryGetValue(operationType, out var foundOperation) || foundOperation is null)
        {
            return false;
        }

        operation = foundOperation;
        return true;
    }
}
