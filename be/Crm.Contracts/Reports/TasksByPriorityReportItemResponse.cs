namespace Crm.Contracts.Reports;

public sealed class TasksByPriorityReportItemResponse
{
    public string Priority { get; set; } = string.Empty;

    public int Count { get; set; }
}
