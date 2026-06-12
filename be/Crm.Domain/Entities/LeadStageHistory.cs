using Crm.Domain.Common;

namespace Crm.Domain.Entities;

public class LeadStageHistory : BaseEntity
{
    public Guid LeadId { get; set; }

    public Lead? Lead { get; set; }

    public Guid PipelineStageId { get; set; }

    public PipelineStage? PipelineStage { get; set; }

    public DateTime EnteredAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ExitedAtUtc { get; set; }

    public int? DurationDays { get; set; }
}
// Tracks every stage movement.
