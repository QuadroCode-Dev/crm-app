namespace Crm.Contracts.Reports;

public sealed class PipelineSummaryReportItemResponse
{
    public Guid StageId { get; set; }

    public string StageName { get; set; } = string.Empty;

    public int LeadCount { get; set; }

    public decimal TotalEstimatedValue { get; set; }

    public decimal AverageDaysInStage { get; set; }
}
