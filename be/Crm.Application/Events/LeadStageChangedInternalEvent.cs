namespace Crm.Application.Events;

public sealed class LeadStageChangedInternalEvent
{
    public Guid LeadId { get; init; }

    public Guid FromStageId { get; init; }

    public Guid ToStageId { get; init; }

    public Guid ChangedByUserId { get; init; }

    public DateTime ChangedAtUtc { get; init; }
}
