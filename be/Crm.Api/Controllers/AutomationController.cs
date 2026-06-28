using System.Security.Claims;
using Crm.Application.Abstractions.Automation;
using Crm.Contracts.Automation;
using Crm.Domain.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/automation/rules")]
public sealed class AutomationController : ControllerBase
{
    private readonly IAutomationRulesService _automationRulesService;

    public AutomationController(IAutomationRulesService automationRulesService)
    {
        _automationRulesService = automationRulesService;
    }

    [HttpGet]
    [Authorize(Policy = CrmPermissions.SettingsAutomationManage)]
    public async Task<ActionResult<IReadOnlyList<AutomationRuleResponse>>> GetRules(
        CancellationToken cancellationToken)
    {
        var response = await _automationRulesService.GetRulesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = CrmPermissions.SettingsAutomationManage)]
    public async Task<ActionResult<AutomationRuleResponse>> GetRule(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _automationRulesService.GetRuleByIdAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.SettingsAutomationManage)]
    public async Task<ActionResult<AutomationRuleResponse>> CreateRule(
        [FromBody] CreateAutomationRuleRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _automationRulesService.CreateRuleAsync(
            request,
            GetCurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetRule), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = CrmPermissions.SettingsAutomationManage)]
    public async Task<ActionResult<AutomationRuleResponse>> UpdateRule(
        Guid id,
        [FromBody] UpdateAutomationRuleRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _automationRulesService.UpdateRuleAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = CrmPermissions.SettingsAutomationManage)]
    public async Task<IActionResult> DeleteRule(
        Guid id,
        CancellationToken cancellationToken)
    {
        await _automationRulesService.DeleteRuleAsync(id, cancellationToken);
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
