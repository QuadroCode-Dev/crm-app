using Crm.Application.Abstractions.Users;
using Crm.Contracts.Users;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUsersManagementService _usersManagementService;

    public UsersController(IUsersManagementService usersManagementService)
    {
        _usersManagementService = usersManagementService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetActiveUsers(
        CancellationToken cancellationToken)
    {
        var response = await _usersManagementService.GetActiveUsersAsync(cancellationToken);
        return Ok(response);
    }
}
