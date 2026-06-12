namespace Crm.Contracts.Reports;

public sealed class StageAgingReportItemResponse
{
    public Guid StageId { get; set; }

    public string StageName { get; set; } = string.Empty;

    public decimal AverageDurationDays { get; set; }

    public int MaxDurationDays { get; set; }

    public int CurrentLeadsInStage { get; set; }
}
