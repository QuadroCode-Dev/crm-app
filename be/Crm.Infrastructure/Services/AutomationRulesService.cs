using System.Linq.Expressions;
using Crm.Application.Abstractions.Automation;
using Crm.Contracts.Automation;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class AutomationRulesService : IAutomationRulesService
{
    private readonly CrmDbContext _dbContext;

    public AutomationRulesService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<AutomationRuleResponse>> GetRulesAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.AutomationRules
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(MapRule())
            .ToListAsync(cancellationToken);
    }

    public async Task<AutomationRuleResponse> GetRuleByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var rule = await _dbContext.AutomationRules
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapRule())
            .FirstOrDefaultAsync(cancellationToken);

        return rule ?? throw new KeyNotFoundException("Automation rule not found.");
    }

    public async Task<AutomationRuleResponse> CreateRuleAsync(
        CreateAutomationRuleRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var parsed = await ValidateAndParseAsync(
            request.Name,
            request.TriggerType,
            request.TargetStageId,
            request.ActionType,
            request.TaskTitleTemplate,
            request.TaskDueOffsetDays,
            cancellationToken);

        var rule = new AutomationRule
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            TriggerType = parsed.TriggerType,
            TargetStageId = parsed.TargetStageId,
            IsActive = request.IsActive,
            ActionType = parsed.ActionType,
            TaskTitleTemplate = request.TaskTitleTemplate.Trim(),
            TaskDescriptionTemplate = NormalizeOptional(request.TaskDescriptionTemplate),
            TaskDueOffsetDays = request.TaskDueOffsetDays,
            AssignToOwner = request.AssignToOwner,
            CreatedByUserId = userId
        };

        _dbContext.AutomationRules.Add(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetRuleByIdAsync(rule.Id, cancellationToken);
    }

    public async Task<AutomationRuleResponse> UpdateRuleAsync(
        Guid id,
        UpdateAutomationRuleRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var parsed = await ValidateAndParseAsync(
            request.Name,
            request.TriggerType,
            request.TargetStageId,
            request.ActionType,
            request.TaskTitleTemplate,
            request.TaskDueOffsetDays,
            cancellationToken);

        var rule = await _dbContext.AutomationRules
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Automation rule not found.");

        rule.Name = request.Name.Trim();
        rule.TriggerType = parsed.TriggerType;
        rule.TargetStageId = parsed.TargetStageId;
        rule.IsActive = request.IsActive;
        rule.ActionType = parsed.ActionType;
        rule.TaskTitleTemplate = request.TaskTitleTemplate.Trim();
        rule.TaskDescriptionTemplate = NormalizeOptional(request.TaskDescriptionTemplate);
        rule.TaskDueOffsetDays = request.TaskDueOffsetDays;
        rule.AssignToOwner = request.AssignToOwner;
        rule.UpdatedByUserId = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetRuleByIdAsync(rule.Id, cancellationToken);
    }

    public async Task DeleteRuleAsync(Guid id, CancellationToken cancellationToken)
    {
        var rule = await _dbContext.AutomationRules
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Automation rule not found.");

        _dbContext.AutomationRules.Remove(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<(AutomationTriggerType TriggerType, Guid TargetStageId, AutomationActionType ActionType)> ValidateAndParseAsync(
        string name,
        string triggerType,
        Guid targetStageId,
        string actionType,
        string taskTitleTemplate,
        int taskDueOffsetDays,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Automation rule name is required.");
        }

        if (string.IsNullOrWhiteSpace(taskTitleTemplate))
        {
            throw new ArgumentException("Task title template is required.");
        }

        if (taskDueOffsetDays < 0)
        {
            throw new ArgumentException("Task due offset days must be zero or greater.");
        }

        if (!Enum.TryParse<AutomationTriggerType>(triggerType.Trim(), true, out var parsedTriggerType))
        {
            throw new ArgumentException("Invalid automation trigger type.");
        }

        if (!Enum.TryParse<AutomationActionType>(actionType.Trim(), true, out var parsedActionType))
        {
            throw new ArgumentException("Invalid automation action type.");
        }

        var stageExists = await _dbContext.PipelineStages
            .AsNoTracking()
            .AnyAsync(x => x.Id == targetStageId && x.IsActive, cancellationToken);

        if (!stageExists)
        {
            throw new KeyNotFoundException("Target stage not found.");
        }

        return (parsedTriggerType, targetStageId, parsedActionType);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static Expression<Func<AutomationRule, AutomationRuleResponse>> MapRule()
    {
        return rule => new AutomationRuleResponse
        {
            Id = rule.Id,
            Name = rule.Name,
            TriggerType = rule.TriggerType.ToString(),
            TargetStageId = rule.TargetStageId,
            TargetStageName = rule.TargetStage != null ? rule.TargetStage.Name : null,
            IsActive = rule.IsActive,
            ActionType = rule.ActionType.ToString(),
            TaskTitleTemplate = rule.TaskTitleTemplate,
            TaskDescriptionTemplate = rule.TaskDescriptionTemplate,
            TaskDueOffsetDays = rule.TaskDueOffsetDays,
            AssignToOwner = rule.AssignToOwner,
            CreatedAtUtc = rule.CreatedAtUtc,
            UpdatedAtUtc = rule.UpdatedAtUtc
        };
    }
}
