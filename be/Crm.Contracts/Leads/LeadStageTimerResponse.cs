namespace Crm.Contracts.Leads;

public sealed class LeadStageTimerResponse
{
    public Guid LeadId { get; set; }

    public Guid CurrentStageId { get; set; }

    public string CurrentStageName { get; set; } = string.Empty;

    public DateTime EnteredAtUtc { get; set; }

    public int DaysInCurrentStage { get; set; }

    public IReadOnlyList<LeadStageTimerHistoryResponse> PreviousStages { get; set; } = Array.Empty<LeadStageTimerHistoryResponse>();
}
