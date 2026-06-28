using System.Security.Claims;
using Crm.Domain.Authorization;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Infrastructure;

public sealed class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    private readonly CrmDbContext _dbContext;

    public PermissionAuthorizationHandler(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var roleClaim = context.User.FindFirstValue(ClaimTypes.Role);

        if (!Enum.TryParse<UserRole>(roleClaim, true, out var role))
        {
            return;
        }

        if (role == UserRole.SuperAdmin)
        {
            context.Succeed(requirement);
            return;
        }

        var hasPermission = await _dbContext.RolePermissions
            .AsNoTracking()
            .AnyAsync(x => x.Role == role && x.PermissionCode == requirement.Permission);

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}
