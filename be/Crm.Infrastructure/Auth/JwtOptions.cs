namespace Crm.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public string Secret { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; }

    public int RefreshTokenDays { get; set; }
}
// This class maps into a C# object so we can access settings cleanly.