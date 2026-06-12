using Crm.Domain.Common;
using Crm.Domain.Enums;

namespace Crm.Domain.Entities;

public class AutomationRule : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public AutomationTriggerType TriggerType { get; set; } = AutomationTriggerType.StageChanged;

    public Guid? TargetStageId { get; set; }

    public PipelineStage? TargetStage { get; set; }

    public bool IsActive { get; set; } = true;

    public AutomationActionType ActionType { get; set; } = AutomationActionType.CreateTask;

    public string TaskTitleTemplate { get; set; } = string.Empty;

    public string? TaskDescriptionTemplate { get; set; }

    public int TaskDueOffsetDays { get; set; } = 1;

    public bool AssignToOwner { get; set; } = true;
}
// Represents automation settings.
