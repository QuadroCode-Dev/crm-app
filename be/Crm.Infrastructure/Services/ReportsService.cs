using Crm.Application.Abstractions.Reports;
using Crm.Contracts.Reports;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainTaskStatus = Crm.Domain.Enums.TaskStatus;

namespace Crm.Infrastructure.Services;

public sealed class ReportsService : IReportsService
{
    private readonly CrmDbContext _dbContext;

    public ReportsService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<LeadsBySourceReportItemResponse>> GetLeadsBySourceAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var leads = await ApplyLeadFilters(_dbContext.Leads.AsNoTracking(), request)
            .Include(x => x.LeadSource)
            .ToListAsync(cancellationToken);

        return leads
            .GroupBy(x => new { x.LeadSourceId, SourceName = x.LeadSource!.Name })
            .OrderBy(x => x.Key.SourceName)
            .Select(x => new LeadsBySourceReportItemResponse
            {
                SourceId = x.Key.LeadSourceId,
                SourceName = x.Key.SourceName,
                TotalLeads = x.Count(),
                OpenLeads = x.Count(lead => lead.Status == LeadStatus.Open),
                WonLeads = x.Count(lead => lead.Status == LeadStatus.Won),
                LostLeads = x.Count(lead => lead.Status == LeadStatus.Lost),
                EstimatedValue = x.Sum(lead => lead.EstimatedCost ?? 0)
            })
            .ToList();
    }

    public async Task<IReadOnlyList<PipelineSummaryReportItemResponse>> GetPipelineSummaryAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var stages = await _dbContext.PipelineStages
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(cancellationToken);

        var leads = await ApplyLeadFilters(_dbContext.Leads.AsNoTracking(), request)
            .Include(x => x.StageHistories)
            .ToListAsync(cancellationToken);

        var utcNow = DateTime.UtcNow;

        return stages
            .Select(stage =>
            {
                var stageLeads = leads
                    .Where(lead => lead.CurrentPipelineStageId == stage.Id)
                    .ToList();

                var currentDurations = stageLeads
                    .Select(lead => lead.StageHistories
                        .Where(history => history.PipelineStageId == stage.Id && history.ExitedAtUtc == null)
                        .OrderByDescending(history => history.EnteredAtUtc)
                        .FirstOrDefault())
                    .Where(history => history is not null)
                    .Select(history => CalculateDays(history!.EnteredAtUtc, utcNow))
                    .ToList();

                return new PipelineSummaryReportItemResponse
                {
                    StageId = stage.Id,
                    StageName = stage.Name,
                    LeadCount = stageLeads.Count,
                    TotalEstimatedValue = stageLeads.Sum(lead => lead.EstimatedCost ?? 0),
                    AverageDaysInStage = Average(currentDurations)
                };
            })
            .ToList();
    }

    public async Task<IReadOnlyList<StageAgingReportItemResponse>> GetStageAgingAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var stages = await _dbContext.PipelineStages
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(cancellationToken);

        var leads = await ApplyLeadFilters(_dbContext.Leads.AsNoTracking(), request)
            .Include(x => x.StageHistories)
            .ToListAsync(cancellationToken);

        var utcNow = DateTime.UtcNow;

        return stages
            .Select(stage =>
            {
                var currentLeadsInStage = leads.Count(lead => lead.CurrentPipelineStageId == stage.Id);
                var durations = leads
                    .SelectMany(lead => lead.StageHistories)
                    .Where(history => history.PipelineStageId == stage.Id)
                    .Select(history => history.DurationDays
                        ?? CalculateDays(history.EnteredAtUtc, history.ExitedAtUtc ?? utcNow))
                    .ToList();

                return new StageAgingReportItemResponse
                {
                    StageId = stage.Id,
                    StageName = stage.Name,
                    AverageDurationDays = Average(durations),
                    MaxDurationDays = durations.Count == 0 ? 0 : durations.Max(),
                    CurrentLeadsInStage = currentLeadsInStage
                };
            })
            .ToList();
    }

    public async Task<TasksSummaryReportResponse> GetTasksSummaryAsync(
        ReportFilterRequest request,
        CancellationToken cancellationToken)
    {
        var tasks = await ApplyTaskFilters(_dbContext.TaskItems.AsNoTracking(), request)
            .ToListAsync(cancellationToken);

        var utcNow = DateTime.UtcNow;
        var tasksByPriority = tasks
            .GroupBy(x => x.Priority)
            .OrderBy(x => x.Key)
            .Select(x => new TasksByPriorityReportItemResponse
            {
                Priority = x.Key.ToString(),
                Count = x.Count()
            })
            .ToList();

        return new TasksSummaryReportResponse
        {
            TotalTasks = tasks.Count,
            PendingTasks = tasks.Count(x => x.Status == DomainTaskStatus.Pending),
            CompletedTasks = tasks.Count(x => x.Status == DomainTaskStatus.Done),
            OverdueTasks = tasks.Count(x =>
                x.DueAtUtc.HasValue &&
                x.DueAtUtc.Value < utcNow &&
                x.Status != DomainTaskStatus.Done),
            TasksByPriority = tasksByPriority
        };
    }

    private static IQueryable<Lead> ApplyLeadFilters(
        IQueryable<Lead> query,
        ReportFilterRequest request)
    {
        if (request.DateFrom.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc <= request.DateTo.Value);
        }

        if (request.SourceId.HasValue)
        {
            query = query.Where(x => x.LeadSourceId == request.SourceId.Value);
        }

        if (request.OwnerUserId.HasValue)
        {
            query = query.Where(x => x.OwnerUserId == request.OwnerUserId.Value);
        }

        return query;
    }

    private static IQueryable<TaskItem> ApplyTaskFilters(
        IQueryable<TaskItem> query,
        ReportFilterRequest request)
    {
        if (request.DateFrom.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc <= request.DateTo.Value);
        }

        if (request.OwnerUserId.HasValue)
        {
            query = query.Where(x => x.AssignedToUserId == request.OwnerUserId.Value);
        }

        return query;
    }

    private static int CalculateDays(DateTime startUtc, DateTime endUtc)
    {
        return Math.Max(0, (int)Math.Floor((endUtc - startUtc).TotalDays));
    }

    private static decimal Average(IReadOnlyCollection<int> values)
    {
        return values.Count == 0 ? 0 : Math.Round((decimal)values.Average(), 2);
    }
}
