using Crm.Application.Abstractions.Auth;
using Crm.Application.Abstractions.Users;
using Crm.Contracts.Users;
using Crm.Domain.Authorization;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class UsersManagementService : IUsersManagementService
{
    private static readonly IReadOnlyList<PermissionResponse> PermissionCatalog = new[]
    {
        Permission(CrmPermissions.UsersManage, "Manage users", "Administration"),
        Permission(CrmPermissions.RolesManage, "Manage roles and permissions", "Administration"),
        Permission(CrmPermissions.ContactsCreate, "Create contacts", "Contacts"),
        Permission(CrmPermissions.ContactsEdit, "Edit contacts", "Contacts"),
        Permission(CrmPermissions.ContactsDelete, "Delete contacts", "Contacts"),
        Permission(CrmPermissions.PipelineView, "View pipeline", "Pipeline"),
        Permission(CrmPermissions.LeadsCreate, "Create leads", "Leads"),
        Permission(CrmPermissions.LeadsEdit, "Edit leads", "Leads"),
        Permission(CrmPermissions.LeadsDelete, "Delete leads", "Leads"),
        Permission(CrmPermissions.LeadsAssign, "Assign leads", "Leads"),
        Permission(CrmPermissions.LeadsChangeStage, "Change lead stage", "Leads"),
        Permission(CrmPermissions.TasksCreate, "Create tasks", "Tasks"),
        Permission(CrmPermissions.TasksEdit, "Edit tasks", "Tasks"),
        Permission(CrmPermissions.TasksDelete, "Delete tasks", "Tasks"),
        Permission(CrmPermissions.TasksAssign, "Assign tasks", "Tasks"),
        Permission(CrmPermissions.TasksComplete, "Complete tasks", "Tasks"),
        Permission(CrmPermissions.ReportsView, "View reports", "Reports"),
        Permission(CrmPermissions.SettingsManage, "Manage settings", "Settings"),
        Permission(CrmPermissions.SettingsPipelineManage, "Manage pipeline stages", "Settings"),
        Permission(CrmPermissions.SettingsServicesManage, "Manage services", "Settings"),
        Permission(CrmPermissions.SettingsAutomationManage, "Manage automation", "Settings"),
        Permission(CrmPermissions.SettingsIntegrationsManage, "Manage integrations", "Settings"),
        Permission(CrmPermissions.SettingsDataImportManage, "Manage data imports", "Settings")
    };

    private readonly CrmDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;

    public UsersManagementService(CrmDbContext dbContext, IPasswordHasher passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<UserResponse>> GetUsersAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .OrderBy(x => x.FullName)
            .Select(x => new UserResponse
            {
                Id = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                Role = x.Role.ToString(),
                IsActive = x.IsActive,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserResponse>> GetActiveUsersAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.FullName)
            .Select(x => new UserResponse
            {
                Id = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                Role = x.Role.ToString(),
                IsActive = x.IsActive,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<UserResponse> CreateUserAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        ValidateUserFields(request.FullName, request.Email);

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            throw new ArgumentException("Password must be at least 8 characters.");
        }

        var role = ParseRole(request.Role);
        var email = NormalizeEmail(request.Email);
        await EnsureEmailIsUniqueAsync(email, null, cancellationToken);

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = role,
            IsActive = request.IsActive
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapUser(user);
    }

    public async Task<UserResponse> UpdateUserAsync(
        Guid id,
        UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        ValidateUserFields(request.FullName, request.Email);

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var role = ParseRole(request.Role);
        var email = NormalizeEmail(request.Email);
        await EnsureEmailIsUniqueAsync(email, id, cancellationToken);

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Role = role;
        user.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapUser(user);
    }

    public Task<IReadOnlyList<PermissionResponse>> GetPermissionsAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult(PermissionCatalog);
    }

    public async Task<IReadOnlyList<RoleResponse>> GetRolesAsync(CancellationToken cancellationToken)
    {
        var rolePermissions = await _dbContext.RolePermissions
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return Enum.GetValues<UserRole>()
            .Select(role => MapRole(role, rolePermissions))
            .ToList();
    }

    public async Task<RoleResponse> UpdateRolePermissionsAsync(
        string roleCode,
        UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var role = ParseRole(roleCode);

        if (role == UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("Super Admin permissions cannot be changed.");
        }

        var permissions = request.Permissions
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var invalidPermission = permissions.FirstOrDefault(x => !CrmPermissions.All.Contains(x));
        if (invalidPermission is not null)
        {
            throw new ArgumentException($"Invalid permission '{invalidPermission}'.");
        }

        var existingPermissions = await _dbContext.RolePermissions
            .Where(x => x.Role == role)
            .ToListAsync(cancellationToken);

        _dbContext.RolePermissions.RemoveRange(existingPermissions);
        _dbContext.RolePermissions.AddRange(permissions.Select(permission => new RolePermission
        {
            Role = role,
            PermissionCode = permission
        }));

        await _dbContext.SaveChangesAsync(cancellationToken);

        var rolePermissions = await _dbContext.RolePermissions
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return MapRole(role, rolePermissions);
    }

    private static PermissionResponse Permission(string code, string label, string group)
    {
        return new PermissionResponse
        {
            Code = code,
            Label = label,
            Group = group
        };
    }

    private static void ValidateUserFields(string fullName, string email)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new ArgumentException("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@', StringComparison.Ordinal))
        {
            throw new ArgumentException("Valid email is required.");
        }
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private async Task EnsureEmailIsUniqueAsync(
        string email,
        Guid? currentUserId,
        CancellationToken cancellationToken)
    {
        var emailExists = await _dbContext.Users
            .AnyAsync(x => x.Email.ToLower() == email && x.Id != currentUserId, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Email is already used by another user.");
        }
    }

    private static UserRole ParseRole(string role)
    {
        if (Enum.TryParse<UserRole>(role?.Trim(), true, out var parsedRole))
        {
            return parsedRole;
        }

        throw new ArgumentException("Invalid user role.");
    }

    private static UserResponse MapUser(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAtUtc,
            UpdatedAtUtc = user.UpdatedAtUtc
        };
    }

    private static RoleResponse MapRole(UserRole role, IReadOnlyList<RolePermission> rolePermissions)
    {
        return new RoleResponse
        {
            Code = role.ToString(),
            Name = FormatRoleName(role),
            IsEditable = role != UserRole.SuperAdmin,
            Permissions = role == UserRole.SuperAdmin
                ? CrmPermissions.All
                : rolePermissions
                    .Where(x => x.Role == role)
                    .Select(x => x.PermissionCode)
                    .OrderBy(x => x)
                    .ToList()
        };
    }

    private static string FormatRoleName(UserRole role)
    {
        return role switch
        {
            UserRole.SuperAdmin => "Super Admin",
            UserRole.SalesManager => "Sales Manager",
            _ => role.ToString()
        };
    }
}
