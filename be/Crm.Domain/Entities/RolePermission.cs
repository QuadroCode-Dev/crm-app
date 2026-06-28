using Crm.Domain.Enums;

namespace Crm.Domain.Entities;

public class RolePermission
{
    public UserRole Role { get; set; }

    public string PermissionCode { get; set; } = string.Empty;
}
