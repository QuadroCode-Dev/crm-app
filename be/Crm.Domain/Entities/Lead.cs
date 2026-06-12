using Crm.Domain.Common;
using Crm.Domain.Enums;

namespace Crm.Domain.Entities;

public class Lead : SoftDeleteEntity
{
    public Guid ContactId { get; set; }

    public Contact? Contact { get; set; }

    public Guid LeadSourceId { get; set; }

    public LeadSource? LeadSource { get; set; }

    public Guid CurrentPipelineStageId { get; set; }

    public PipelineStage? CurrentPipelineStage { get; set; }

    public Guid? OwnerUserId { get; set; }

    public User? OwnerUser { get; set; }

    public string Title { get; set; } = string.Empty;

    public LeadStatus Status { get; set; } = LeadStatus.Open;

    public decimal? EstimatedCost { get; set; }

    public string? ServiceRequested { get; set; }

    public string? Message { get; set; }

    public bool IsDuplicateWarning { get; set; }

    public ICollection<LeadStageHistory> StageHistories { get; set; } = new List<LeadStageHistory>();

    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();

    public ICollection<Note> Notes { get; set; } = new List<Note>();

    public ICollection<ActivityLog> Activities { get; set; } = new List<ActivityLog>();
}
// Represents a sales opportunity.