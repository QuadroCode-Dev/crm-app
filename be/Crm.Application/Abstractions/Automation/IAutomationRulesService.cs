using Crm.Contracts.Automation;

namespace Crm.Application.Abstractions.Automation;

public interface IAutomationRulesService
{
    Task<IReadOnlyList<AutomationRuleResponse>> GetRulesAsync(CancellationToken cancellationToken);

    Task<AutomationRuleResponse> GetRuleByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<AutomationRuleResponse> CreateRuleAsync(
        CreateAutomationRuleRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<AutomationRuleResponse> UpdateRuleAsync(
        Guid id,
        UpdateAutomationRuleRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task DeleteRuleAsync(Guid id, CancellationToken cancellationToken);
}
