using Crm.Application.Abstractions.Users;
using Crm.Contracts.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin")]
[Route("api/users-management")]
public sealed class UsersManagementController : ControllerBase
{
    private readonly IUsersManagementService _usersManagementService;

    public UsersManagementController(IUsersManagementService usersManagementService)
    {
        _usersManagementService = usersManagementService;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetUsers(
        CancellationToken cancellationToken)
    {
        var response = await _usersManagementService.GetUsersAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost("users")]
    public async Task<ActionResult<UserResponse>> CreateUser(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _usersManagementService.CreateUserAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetUsers), response);
    }

    [HttpPut("users/{id:guid}")]
    public async Task<ActionResult<UserResponse>> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _usersManagementService.UpdateUserAsync(id, request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("permissions")]
    public async Task<ActionResult<IReadOnlyList<PermissionResponse>>> GetPermissions(
        CancellationToken cancellationToken)
    {
        var response = await _usersManagementService.GetPermissionsAsync(cancellationToken);
        return Ok(response);
    }

    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> GetRoles(
        CancellationToken cancellationToken)
    {
        var response = await _usersManagementService.GetRolesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPut("roles/{roleCode}/permissions")]
    public async Task<ActionResult<RoleResponse>> UpdateRolePermissions(
        string roleCode,
        [FromBody] UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _usersManagementService.UpdateRolePermissionsAsync(
            roleCode,
            request,
            cancellationToken);

        return Ok(response);
    }
}
