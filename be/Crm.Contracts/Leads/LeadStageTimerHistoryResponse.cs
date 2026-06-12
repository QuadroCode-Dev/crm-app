namespace Crm.Contracts.Leads;

public sealed class LeadStageTimerHistoryResponse
{
    public Guid StageId { get; set; }

    public string StageName { get; set; } = string.Empty;

    public DateTime EnteredAtUtc { get; set; }

    public DateTime? ExitedAtUtc { get; set; }

    public int DurationDays { get; set; }
}
