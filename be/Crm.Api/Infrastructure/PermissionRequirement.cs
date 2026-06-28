using Microsoft.AspNetCore.Authorization;

namespace Crm.Api.Infrastructure;

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }

    public string Permission { get; }
}
