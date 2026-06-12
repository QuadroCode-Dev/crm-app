using Crm.Application.Abstractions.Automation;
using Crm.Application.Abstractions.Tasks;
using Crm.Application.Events;
using Crm.Contracts.Tasks;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainTaskStatus = Crm.Domain.Enums.TaskStatus;

namespace Crm.Infrastructure.Services;

public sealed class AutomationEventHandler : IAutomationEventHandler
{
    private readonly CrmDbContext _dbContext;
    private readonly ITasksService _tasksService;

    public AutomationEventHandler(
        CrmDbContext dbContext,
        ITasksService tasksService)
    {
        _dbContext = dbContext;
        _tasksService = tasksService;
    }

    public async Task HandleAsync(LeadStageChangedInternalEvent @event, CancellationToken cancellationToken)
    {
        var lead = await _dbContext.Leads
            .AsNoTracking()
            .Include(x => x.Contact)
            .Include(x => x.CurrentPipelineStage)
            .FirstOrDefaultAsync(x => x.Id == @event.LeadId, cancellationToken);

        if (lead is null)
        {
            return;
        }

        var rules = await _dbContext.AutomationRules
            .AsNoTracking()
            .Where(x =>
                x.IsActive &&
                x.TriggerType == AutomationTriggerType.StageChanged &&
                x.ActionType == AutomationActionType.CreateTask &&
                x.TargetStageId == @event.ToStageId)
            .ToListAsync(cancellationToken);

        foreach (var rule in rules)
        {
            var renderedTitle = RenderTemplate(
                rule.TaskTitleTemplate,
                lead.Title,
                lead.Contact?.FullName,
                lead.CurrentPipelineStage?.Name,
                lead.ServiceRequested);

            var renderedDescription = RenderTemplate(
                rule.TaskDescriptionTemplate,
                lead.Title,
                lead.Contact?.FullName,
                lead.CurrentPipelineStage?.Name,
                lead.ServiceRequested);

            await _tasksService.CreateTaskAsync(
                new CreateTaskRequest
                {
                    LeadId = lead.Id,
                    ContactId = lead.ContactId,
                    AssignedToUserId = rule.AssignToOwner ? lead.OwnerUserId : null,
                    Title = renderedTitle,
                    Description = renderedDescription,
                    DueAtUtc = @event.ChangedAtUtc.Date.AddDays(rule.TaskDueOffsetDays),
                    Priority = TaskPriority.Medium.ToString(),
                    Status = DomainTaskStatus.Pending.ToString()
                },
                @event.ChangedByUserId,
                cancellationToken);

            _dbContext.ActivityLogs.Add(new ActivityLog
            {
                Id = Guid.NewGuid(),
                LeadId = lead.Id,
                ContactId = lead.ContactId,
                UserId = @event.ChangedByUserId,
                ActivityType = ActivityType.AutomationTriggered,
                Title = "Automation triggered",
                Description = $"Automation rule '{rule.Name}' created a task.",
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string RenderTemplate(
        string? template,
        string leadTitle,
        string? contactName,
        string? stageName,
        string? serviceRequested)
    {
        if (string.IsNullOrWhiteSpace(template))
        {
            return string.Empty;
        }

        return template
            .Replace("{leadTitle}", leadTitle, StringComparison.Ordinal)
            .Replace("{contactName}", contactName ?? string.Empty, StringComparison.Ordinal)
            .Replace("{stageName}", stageName ?? string.Empty, StringComparison.Ordinal)
            .Replace("{serviceRequested}", serviceRequested ?? string.Empty, StringComparison.Ordinal);
    }
}
