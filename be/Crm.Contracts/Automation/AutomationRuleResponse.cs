namespace Crm.Contracts.Automation;

public sealed class AutomationRuleResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string TriggerType { get; set; } = string.Empty;

    public Guid? TargetStageId { get; set; }

    public string? TargetStageName { get; set; }

    public bool IsActive { get; set; }

    public string ActionType { get; set; } = string.Empty;

    public string TaskTitleTemplate { get; set; } = string.Empty;

    public string? TaskDescriptionTemplate { get; set; }

    public int TaskDueOffsetDays { get; set; }

    public bool AssignToOwner { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
