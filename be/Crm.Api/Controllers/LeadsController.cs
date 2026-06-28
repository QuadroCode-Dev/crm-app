using System.Security.Claims;
using Crm.Application.Abstractions.Leads;
using Crm.Contracts.Common;
using Crm.Contracts.Leads;
using Crm.Domain.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/leads")]
public sealed class LeadsController : ControllerBase
{
    private readonly ILeadsService _leadsService;

    public LeadsController(ILeadsService leadsService)
    {
        _leadsService = leadsService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<LeadResponse>>> GetLeads(
        [FromQuery] LeadListRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.GetLeadsAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LeadResponse>> GetLead(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.GetLeadByIdAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.LeadsCreate)]
    public async Task<ActionResult<LeadResponse>> CreateLead(
        [FromBody] CreateLeadRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.CreateLeadAsync(
            request,
            GetCurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetLead), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<ActionResult<LeadResponse>> UpdateLead(
        Guid id,
        [FromBody] UpdateLeadRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.UpdateLeadAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = CrmPermissions.LeadsDelete)]
    public async Task<IActionResult> DeleteLead(
        Guid id,
        CancellationToken cancellationToken)
    {
        await _leadsService.DeleteLeadAsync(id, GetCurrentUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/stage")]
    [Authorize(Policy = CrmPermissions.LeadsChangeStage)]
    public async Task<ActionResult<LeadResponse>> ChangeStage(
        Guid id,
        [FromBody] ChangeLeadStageRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.ChangeStageAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpGet("{id:guid}/stage-timer")]
    public async Task<ActionResult<LeadStageTimerResponse>> GetStageTimer(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.GetStageTimerAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}/timeline")]
    public async Task<ActionResult<IReadOnlyList<LeadTimelineActivityResponse>>> GetTimeline(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.GetTimelineAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}/duplicates")]
    public async Task<ActionResult<LeadDuplicatesResponse>> GetDuplicates(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _leadsService.GetDuplicatesAsync(id, cancellationToken);
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
