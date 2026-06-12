using System.Text;
using Crm.Api.Infrastructure;
using Crm.Application.Abstractions.Auth;
using Crm.Infrastructure;
using Crm.Infrastructure.Persistence;
using Crm.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);
const string CorsPolicyName = "ConfiguredOrigins";

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ProblemDetailsExceptionHandler>();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Description = "Paste JWT token here. Do not type Bearer manually."
    });
    options.DocumentFilter<AuthorizeDocumentFilter>();
});

builder.Services.AddInfrastructure(builder.Configuration);

var allowedOrigins = GetConfiguredOrigins(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSection = builder.Configuration.GetSection("Jwt");
        var secret = jwtSection["Secret"]!;

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var authorizationHeader = context.Request.Headers.Authorization.ToString().Trim();

                if (string.IsNullOrWhiteSpace(authorizationHeader))
                {
                    return Task.CompletedTask;
                }

                if (authorizationHeader.StartsWith("Bearer Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    context.Token = authorizationHeader["Bearer Bearer ".Length..].Trim();
                    return Task.CompletedTask;
                }

                if (!authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    context.Token = authorizationHeader;
                }

                return Task.CompletedTask;
            }
        };

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(secret))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

var app = builder.Build();

app.UseExceptionHandler();

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/swagger"))
    {
        context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        context.Response.Headers.Pragma = "no-cache";
        context.Response.Headers.Expires = "0";
    }

    await next();
});

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.UseSwagger();

    app.UseSwaggerUI(options =>
    {
        options.EnablePersistAuthorization();
    });
}

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(CorsPolicyName);

app.UseAuthentication();

app.UseAuthorization();

app.MapGet("/health", async (CrmDbContext dbContext, CancellationToken cancellationToken) =>
{
    var databaseHealthy = await dbContext.Database.CanConnectAsync(cancellationToken);
    var response = new
    {
        status = databaseHealthy ? "Healthy" : "Degraded",
        database = databaseHealthy ? "Healthy" : "Unavailable"
    };

    return databaseHealthy
        ? Results.Ok(response)
        : Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable);
})
.AllowAnonymous();

app.MapControllers()
    .RequireAuthorization();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    var dbContext = services.GetRequiredService<CrmDbContext>();
    if (app.Environment.IsEnvironment("Testing"))
    {
        await dbContext.Database.EnsureCreatedAsync();
    }
    else
    {
        await dbContext.Database.MigrateAsync();
    }

    var passwordHasher = services.GetRequiredService<IPasswordHasher>();

await AdminSeeder.SeedAsync(
        dbContext,
        builder.Configuration,
        passwordHasher);
}

app.Run();

static string[] GetConfiguredOrigins(IConfiguration configuration)
{
    var origins = configuration["CRM_ALLOWED_ORIGINS"]
        ?? configuration["Cors:AllowedOrigins"];

    return string.IsNullOrWhiteSpace(origins)
        ? Array.Empty<string>()
        : origins
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .ToArray();
}

public partial class Program;
