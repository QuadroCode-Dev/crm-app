using Crm.Contracts.Users;

namespace Crm.Application.Abstractions.Users;

public interface IUsersManagementService
{
    Task<IReadOnlyList<UserResponse>> GetUsersAsync(CancellationToken cancellationToken);

    Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task<UserResponse> UpdateUserAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<PermissionResponse>> GetPermissionsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<RoleResponse>> GetRolesAsync(CancellationToken cancellationToken);

    Task<RoleResponse> UpdateRolePermissionsAsync(
        string roleCode,
        UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken);
}
