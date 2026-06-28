using System.Security.Claims;
using Crm.Application.Abstractions.Tasks;
using Crm.Contracts.Tasks;
using Crm.Domain.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public sealed class TasksController : ControllerBase
{
    private readonly ITasksService _tasksService;

    public TasksController(ITasksService tasksService)
    {
        _tasksService = tasksService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskResponse>>> GetTasks(
        [FromQuery] TaskListRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _tasksService.GetTasksAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TaskResponse>> GetTask(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _tasksService.GetTaskByIdAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.TasksCreate)]
    public async Task<ActionResult<TaskResponse>> CreateTask(
        [FromBody] CreateTaskRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _tasksService.CreateTaskAsync(
            request,
            GetCurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetTask), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = CrmPermissions.TasksEdit)]
    public async Task<ActionResult<TaskResponse>> UpdateTask(
        Guid id,
        [FromBody] UpdateTaskRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _tasksService.UpdateTaskAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpPatch("{id:guid}/complete")]
    [Authorize(Policy = CrmPermissions.TasksComplete)]
    public async Task<ActionResult<TaskResponse>> CompleteTask(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _tasksService.CompleteTaskAsync(
            id,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = CrmPermissions.TasksDelete)]
    public async Task<IActionResult> DeleteTask(
        Guid id,
        CancellationToken cancellationToken)
    {
        await _tasksService.DeleteTaskAsync(id, GetCurrentUserId(), cancellationToken);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Authenticated user id was not found.");
        }

        return userId;
    }
}
