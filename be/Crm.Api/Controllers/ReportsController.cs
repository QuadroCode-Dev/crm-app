using Crm.Application.Abstractions.Reports;
using Crm.Contracts.Reports;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportsService _reportsService;

    public ReportsController(IReportsService reportsService)
    {
        _reportsService = reportsService;
    }

    [HttpGet("leads-by-source")]
    public async Task<ActionResult<IReadOnlyList<LeadsBySourceReportItemResponse>>> GetLeadsBySource(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetLeadsBySourceAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("pipeline-summary")]
    public async Task<ActionResult<IReadOnlyList<PipelineSummaryReportItemResponse>>> GetPipelineSummary(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetPipelineSummaryAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("stage-aging")]
    public async Task<ActionResult<IReadOnlyList<StageAgingReportItemResponse>>> GetStageAging(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetStageAgingAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("tasks-summary")]
    public async Task<ActionResult<TasksSummaryReportResponse>> GetTasksSummary(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetTasksSummaryAsync(request, cancellationToken);
        return Ok(response);
    }
}
