using System.Linq.Expressions;
using Crm.Application.Abstractions.Pipeline;
using Crm.Contracts.Pipeline;
using Crm.Domain.Entities;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class PipelineService : IPipelineService
{
    private readonly CrmDbContext _dbContext;

    public PipelineService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<PipelineStageResponse>> GetStagesAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.PipelineStages
            .AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .Select(MapStage())
            .ToListAsync(cancellationToken);
    }

    public async Task<PipelineStageResponse> CreateStageAsync(
        CreatePipelineStageRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateStageRequest(request.Name, request.SortOrder, request.RottingThresholdHours);
        await ValidateStageRulesAsync(
            request.IsDefault,
            request.IsWonStage,
            request.IsLostStage,
            request.SortOrder,
            null,
            cancellationToken);

        var stage = new PipelineStage
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            SortOrder = request.SortOrder,
            Color = NormalizeOptional(request.Color),
            RottingThresholdHours = request.RottingThresholdHours,
            IsDefault = request.IsDefault,
            IsWonStage = request.IsWonStage,
            IsLostStage = request.IsLostStage,
            IsActive = request.IsActive,
            CreatedByUserId = userId
        };

        _dbContext.PipelineStages.Add(stage);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetStageByIdAsync(stage.Id, cancellationToken);
    }

    public async Task<PipelineStageResponse> UpdateStageAsync(
        Guid id,
        UpdatePipelineStageRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateStageRequest(request.Name, request.SortOrder, request.RottingThresholdHours);

        var stage = await _dbContext.PipelineStages
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Pipeline stage not found.");

        await ValidateStageRulesAsync(
            request.IsDefault,
            request.IsWonStage,
            request.IsLostStage,
            request.SortOrder,
            stage.Id,
            cancellationToken);

        stage.Name = request.Name.Trim();
        stage.SortOrder = request.SortOrder;
        stage.Color = NormalizeOptional(request.Color);
        stage.RottingThresholdHours = request.RottingThresholdHours;
        stage.IsDefault = request.IsDefault;
        stage.IsWonStage = request.IsWonStage;
        stage.IsLostStage = request.IsLostStage;
        stage.IsActive = request.IsActive;
        stage.UpdatedByUserId = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetStageByIdAsync(stage.Id, cancellationToken);
    }

    public async Task DeleteStageAsync(
        Guid id,
        DeletePipelineStageRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var stage = await _dbContext.PipelineStages
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Pipeline stage not found.");

        var utcNow = DateTime.UtcNow;

        var activeStagesCount = await _dbContext.PipelineStages.CountAsync(x => x.IsActive, cancellationToken);
        if (activeStagesCount <= 1 && stage.IsActive)
        {
            throw new InvalidOperationException("Cannot delete the only active stage.");
        }

        var activeLeads = await _dbContext.Leads
            .Where(x => x.CurrentPipelineStageId == id)
            .ToListAsync(cancellationToken);

        PipelineStage? replacementStage = null;
        if (activeLeads.Count > 0)
        {
            if (!request.ReplacementStageId.HasValue)
            {
                throw new InvalidOperationException("A replacement stage is required when deleting a stage with active leads.");
            }

            replacementStage = await _dbContext.PipelineStages
                .FirstOrDefaultAsync(
                    x => x.Id == request.ReplacementStageId.Value &&
                         x.Id != id &&
                         x.IsActive,
                    cancellationToken)
                ?? throw new KeyNotFoundException("Replacement stage not found.");

            var openHistories = await _dbContext.LeadStageHistories
                .Where(x => x.PipelineStageId == id && x.ExitedAtUtc == null)
                .ToListAsync(cancellationToken);
            foreach (var lead in activeLeads)
            {
                lead.CurrentPipelineStageId = replacementStage.Id;
                lead.UpdatedByUserId = userId;

                if (replacementStage.IsWonStage)
                {
                    lead.Status = Domain.Enums.LeadStatus.Won;
                }
                else if (replacementStage.IsLostStage)
                {
                    lead.Status = Domain.Enums.LeadStatus.Lost;
                }
                else
                {
                    lead.Status = Domain.Enums.LeadStatus.Open;
                }
            }

            foreach (var history in openHistories)
            {
                history.ExitedAtUtc = utcNow;
                history.DurationDays = CalculateDurationDays(history.EnteredAtUtc, utcNow);
            }

            foreach (var lead in activeLeads)
            {
                _dbContext.LeadStageHistories.Add(new LeadStageHistory
                {
                    Id = Guid.NewGuid(),
                    LeadId = lead.Id,
                    PipelineStageId = replacementStage.Id,
                    EnteredAtUtc = utcNow
                });
            }
        }

        stage.DeletedAtUtc = utcNow;
        stage.DeletedByUserId = userId;
        stage.UpdatedAtUtc = utcNow;
        stage.UpdatedByUserId = userId;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PipelineStageResponse>> ReorderStagesAsync(
        ReorderPipelineStagesRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (request.Stages.Count == 0)
        {
            throw new ArgumentException("At least one stage reorder item is required.");
        }

        var distinctIds = request.Stages.Select(x => x.Id).Distinct().Count();
        if (distinctIds != request.Stages.Count)
        {
            throw new ArgumentException("Stage ids must be unique.");
        }

        var distinctSortOrders = request.Stages.Select(x => x.SortOrder).Distinct().Count();
        if (distinctSortOrders != request.Stages.Count)
        {
            throw new ArgumentException("Sort orders must be unique.");
        }

        var ids = request.Stages.Select(x => x.Id).ToList();
        var stages = await _dbContext.PipelineStages
            .Where(x => ids.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (stages.Count != ids.Count)
        {
            throw new KeyNotFoundException("One or more pipeline stages were not found.");
        }

        var requestedSortOrders = request.Stages.Select(x => x.SortOrder).ToList();
        var conflictingSortOrderExists = await _dbContext.PipelineStages
            .AnyAsync(
                x => !ids.Contains(x.Id) && requestedSortOrders.Contains(x.SortOrder),
                cancellationToken);

        if (conflictingSortOrderExists)
        {
            throw new InvalidOperationException("Stage sort order must be unique.");
        }

        foreach (var item in request.Stages)
        {
            var stage = stages.Single(x => x.Id == item.Id);
            stage.SortOrder = -item.SortOrder;
            stage.UpdatedByUserId = userId;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var item in request.Stages)
        {
            var stage = stages.Single(x => x.Id == item.Id);
            stage.SortOrder = item.SortOrder;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetStagesAsync(cancellationToken);
    }

    private async Task<PipelineStageResponse> GetStageByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var stage = await _dbContext.PipelineStages
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapStage())
            .FirstOrDefaultAsync(cancellationToken);

        return stage ?? throw new KeyNotFoundException("Pipeline stage not found.");
    }

    private async Task ValidateStageRulesAsync(
        bool isDefault,
        bool isWonStage,
        bool isLostStage,
        int sortOrder,
        Guid? currentStageId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.PipelineStages.AsQueryable();
        if (currentStageId.HasValue)
        {
            query = query.Where(x => x.Id != currentStageId.Value);
        }

        if (await query.AnyAsync(x => x.SortOrder == sortOrder, cancellationToken))
        {
            throw new InvalidOperationException("Stage sort order must be unique.");
        }

        if (isDefault && await query.AnyAsync(x => x.IsDefault, cancellationToken))
        {
            throw new InvalidOperationException("Only one default stage is allowed.");
        }

        if (isWonStage && await query.AnyAsync(x => x.IsWonStage, cancellationToken))
        {
            throw new InvalidOperationException("Only one won stage is allowed.");
        }

        if (isLostStage && await query.AnyAsync(x => x.IsLostStage, cancellationToken))
        {
            throw new InvalidOperationException("Only one lost stage is allowed.");
        }
    }

    private static void ValidateStageRequest(string name, int sortOrder, int rottingThresholdHours)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Stage name is required.");
        }

        if (sortOrder <= 0)
        {
            throw new ArgumentException("Sort order must be greater than zero.");
        }

        if (rottingThresholdHours <= 0)
        {
            throw new ArgumentException("Rotting threshold must be greater than zero.");
        }
    }

    private static int CalculateDurationDays(DateTime enteredAtUtc, DateTime exitedAtUtc)
    {
        return Math.Max(0, (int)Math.Floor((exitedAtUtc - enteredAtUtc).TotalDays));
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static Expression<Func<PipelineStage, PipelineStageResponse>> MapStage()
    {
        return stage => new PipelineStageResponse
        {
            Id = stage.Id,
            Name = stage.Name,
            SortOrder = stage.SortOrder,
            Color = stage.Color,
            RottingThresholdHours = stage.RottingThresholdHours,
            IsDefault = stage.IsDefault,
            IsWonStage = stage.IsWonStage,
            IsLostStage = stage.IsLostStage,
            IsActive = stage.IsActive,
            CreatedAtUtc = stage.CreatedAtUtc,
            UpdatedAtUtc = stage.UpdatedAtUtc
        };
    }
}
