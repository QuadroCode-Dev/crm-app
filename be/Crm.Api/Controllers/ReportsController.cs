using Crm.Application.Abstractions.Reports;
using Crm.Contracts.Reports;
using Crm.Domain.Authorization;
using Microsoft.AspNetCore.Authorization;
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
    [Authorize(Policy = CrmPermissions.ReportsView)]
    public async Task<ActionResult<IReadOnlyList<LeadsBySourceReportItemResponse>>> GetLeadsBySource(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetLeadsBySourceAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("pipeline-summary")]
    [Authorize(Policy = CrmPermissions.ReportsView)]
    public async Task<ActionResult<IReadOnlyList<PipelineSummaryReportItemResponse>>> GetPipelineSummary(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetPipelineSummaryAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("stage-aging")]
    [Authorize(Policy = CrmPermissions.ReportsView)]
    public async Task<ActionResult<IReadOnlyList<StageAgingReportItemResponse>>> GetStageAging(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetStageAgingAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("tasks-summary")]
    [Authorize(Policy = CrmPermissions.ReportsView)]
    public async Task<ActionResult<TasksSummaryReportResponse>> GetTasksSummary(
        [FromQuery] ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _reportsService.GetTasksSummaryAsync(request, cancellationToken);
        return Ok(response);
    }
}
