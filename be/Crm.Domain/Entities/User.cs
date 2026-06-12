using Crm.Domain.Common;
using Crm.Domain.Enums;

namespace Crm.Domain.Entities;

public class User : AuditableEntity
{
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Agent;

    public bool IsActive { get; set; } = true;

    public string? RefreshTokenHash { get; set; }

    public DateTime? RefreshTokenExpiresAtUtc { get; set; }

    public DateTime? RefreshTokenRevokedAtUtc { get; set; }
}
