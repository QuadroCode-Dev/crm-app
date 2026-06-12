using System.Security.Claims;
using Crm.Application.Abstractions.Pipeline;
using Crm.Contracts.Pipeline;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/pipeline/stages")]
public sealed class PipelineController : ControllerBase
{
    private readonly IPipelineService _pipelineService;

    public PipelineController(IPipelineService pipelineService)
    {
        _pipelineService = pipelineService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PipelineStageResponse>>> GetStages(
        CancellationToken cancellationToken)
    {
        var response = await _pipelineService.GetStagesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<PipelineStageResponse>> CreateStage(
        [FromBody] CreatePipelineStageRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _pipelineService.CreateStageAsync(
            request,
            GetCurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetStages), response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PipelineStageResponse>> UpdateStage(
        Guid id,
        [FromBody] UpdatePipelineStageRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _pipelineService.UpdateStageAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteStage(
        Guid id,
        [FromQuery] Guid? replacementStageId,
        [FromBody] DeletePipelineStageRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new DeletePipelineStageRequest();
        request.ReplacementStageId ??= replacementStageId;

        await _pipelineService.DeleteStageAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<ActionResult<IReadOnlyList<PipelineStageResponse>>> ReorderStages(
        [FromBody] ReorderPipelineStagesRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _pipelineService.ReorderStagesAsync(
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
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
