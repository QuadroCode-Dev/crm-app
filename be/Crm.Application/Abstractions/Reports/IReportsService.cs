using Crm.Contracts.Reports;

namespace Crm.Application.Abstractions.Reports;

public interface IReportsService
{
    Task<IReadOnlyList<LeadsBySourceReportItemResponse>> GetLeadsBySourceAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PipelineSummaryReportItemResponse>> GetPipelineSummaryAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<StageAgingReportItemResponse>> GetStageAgingAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken);

    Task<TasksSummaryReportResponse> GetTasksSummaryAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken);
}
