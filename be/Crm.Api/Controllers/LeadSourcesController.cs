using Crm.Application.Abstractions.LeadSources;
using Crm.Contracts.LeadSources;
using Crm.Domain.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/lead-sources")]
public sealed class LeadSourcesController : ControllerBase
{
    private readonly ILeadSourcesService _leadSourcesService;

    public LeadSourcesController(ILeadSourcesService leadSourcesService)
    {
        _leadSourcesService = leadSourcesService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LeadSourceResponse>>> GetLeadSources(
        CancellationToken cancellationToken)
    {
        var response = await _leadSourcesService.GetLeadSourcesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.SettingsManage)]
    public async Task<ActionResult<LeadSourceResponse>> CreateLeadSource(
        [FromBody] CreateLeadSourceRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _leadSourcesService.CreateLeadSourceAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetLeadSources), response);
    }
}
