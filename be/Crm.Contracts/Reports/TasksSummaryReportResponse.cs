namespace Crm.Contracts.Reports;

public sealed class TasksSummaryReportResponse
{
    public int TotalTasks { get; set; }

    public int PendingTasks { get; set; }

    public int CompletedTasks { get; set; }

    public int OverdueTasks { get; set; }

    public IReadOnlyList<TasksByPriorityReportItemResponse> TasksByPriority { get; set; } =
        Array.Empty<TasksByPriorityReportItemResponse>();
}
