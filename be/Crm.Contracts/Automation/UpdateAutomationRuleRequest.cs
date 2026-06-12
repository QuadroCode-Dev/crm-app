namespace Crm.Contracts.Automation;

public sealed class UpdateAutomationRuleRequest
{
    public string Name { get; set; } = string.Empty;

    public string TriggerType { get; set; } = "StageChanged";

    public Guid TargetStageId { get; set; }

    public bool IsActive { get; set; } = true;

    public string ActionType { get; set; } = "CreateTask";

    public string TaskTitleTemplate { get; set; } = string.Empty;

    public string? TaskDescriptionTemplate { get; set; }

    public int TaskDueOffsetDays { get; set; } = 1;

    public bool AssignToOwner { get; set; } = true;
}
