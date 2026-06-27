using System.Linq.Expressions;
using Crm.Application.Abstractions.Events;
using Crm.Application.Abstractions.Leads;
using Crm.Application.Events;
using Crm.Contracts.Common;
using Crm.Contracts.Leads;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class LeadsService : ILeadsService
{
    private readonly CrmDbContext _dbContext;
    private readonly IInternalEventPublisher _internalEventPublisher;
    private readonly ILeadDuplicateService _leadDuplicateService;

    public LeadsService(
        CrmDbContext dbContext,
        IInternalEventPublisher internalEventPublisher,
        ILeadDuplicateService leadDuplicateService)
    {
        _dbContext = dbContext;
        _internalEventPublisher = internalEventPublisher;
        _leadDuplicateService = leadDuplicateService;
    }

    public async Task<PagedResponse<LeadResponse>> GetLeadsAsync(
        LeadListRequest request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = BuildLeadQuery(request);
        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapLead())
            .ToListAsync(cancellationToken);

        return new PagedResponse<LeadResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<LeadResponse> GetLeadByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var lead = await _dbContext.Leads
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapLead())
            .FirstOrDefaultAsync(cancellationToken);

        return lead ?? throw new KeyNotFoundException("Lead not found.");
    }

    public async Task<LeadResponse> CreateLeadAsync(
        CreateLeadRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var status = ParseStatus(request.Status) ?? LeadStatus.Open;
        var contact = await ResolveCreateContactAsync(request, userId, cancellationToken);
        var leadTitle = BuildInquiryTitle(request.ServiceRequested, contact.FullName, request.Title);
        ValidateLead(leadTitle);

        var leadSource = await _dbContext.LeadSources
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.LeadSourceId && x.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("Lead source not found.");

        var stage = await _dbContext.PipelineStages
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.CurrentPipelineStageId && x.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("Pipeline stage not found.");

        var owner = await ValidateOwnerAsync(request.OwnerUserId, cancellationToken);
        var utcNow = DateTime.UtcNow;

        var lead = new Lead
        {
            Id = Guid.NewGuid(),
            ContactId = contact.Id,
            LeadSourceId = leadSource.Id,
            CurrentPipelineStageId = stage.Id,
            OwnerUserId = owner?.Id,
            Title = leadTitle,
            Status = status,
            EstimatedCost = request.EstimatedCost,
            ServiceRequested = NormalizeOptional(request.ServiceRequested),
            Message = NormalizeOptional(request.Message),
            CreatedByUserId = userId
        };

        _dbContext.Leads.Add(lead);
        await _leadDuplicateService.ApplyDuplicateWarningAsync(
            lead,
            contact,
            userId,
            utcNow,
            cancellationToken);

        _dbContext.LeadStageHistories.Add(new LeadStageHistory
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            PipelineStageId = stage.Id,
            EnteredAtUtc = utcNow
        });
        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            ContactId = contact.Id,
            UserId = userId,
            ActivityType = ActivityType.LeadCreated,
            Title = "Lead created",
            Description = $"Lead '{lead.Title}' was created.",
            CreatedAtUtc = utcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetLeadByIdAsync(lead.Id, cancellationToken);
    }

    public async Task<LeadResponse> UpdateLeadAsync(
        Guid id,
        UpdateLeadRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var lead = await _dbContext.Leads
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Lead not found.");

        var contact = await _dbContext.Contacts
            .FirstOrDefaultAsync(x => x.Id == request.ContactId, cancellationToken)
            ?? throw new KeyNotFoundException("Contact not found.");

        _ = await _dbContext.LeadSources
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.LeadSourceId && x.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("Lead source not found.");

        if (lead.CurrentPipelineStageId != request.CurrentPipelineStageId)
        {
            throw new InvalidOperationException("Use the stage change endpoint to move a lead between stages.");
        }

        _ = await _dbContext.PipelineStages
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.CurrentPipelineStageId && x.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("Pipeline stage not found.");

        var owner = await ValidateOwnerAsync(request.OwnerUserId, cancellationToken);
        var status = ParseStatus(request.Status) ?? LeadStatus.Open;

        contact.Salutation = NormalizeOptional(request.ContactSalutation);
        contact.FullName = NormalizeRequired(request.ContactName, contact.FullName);
        contact.Email = NormalizeOptional(request.ContactEmail);
        contact.Phone = NormalizeOptional(request.ContactPhone);
        var leadTitle = BuildInquiryTitle(request.ServiceRequested, contact.FullName, request.Title);
        ValidateLead(leadTitle);

        lead.ContactId = contact.Id;
        lead.LeadSourceId = request.LeadSourceId;
        lead.OwnerUserId = owner?.Id;
        lead.Title = leadTitle;
        lead.Status = status;
        lead.EstimatedCost = request.EstimatedCost;
        lead.ServiceRequested = NormalizeOptional(request.ServiceRequested);
        lead.Message = NormalizeOptional(request.Message);
        lead.UpdatedByUserId = userId;

        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            ContactId = contact.Id,
            UserId = userId,
            ActivityType = ActivityType.LeadUpdated,
            Title = "Lead updated",
            Description = $"Lead '{lead.Title}' was updated.",
            CreatedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetLeadByIdAsync(lead.Id, cancellationToken);
    }

    public async Task DeleteLeadAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var lead = await _dbContext.Leads
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Lead not found.");

        lead.DeletedByUserId = userId;
        _dbContext.Leads.Remove(lead);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<LeadResponse> ChangeStageAsync(
        Guid id,
        ChangeLeadStageRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var lead = await _dbContext.Leads
            .Include(x => x.CurrentPipelineStage)
            .Include(x => x.Contact)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Lead not found.");

        var targetStage = await _dbContext.PipelineStages
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.PipelineStageId && x.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("Pipeline stage not found.");

        if (lead.CurrentPipelineStageId == targetStage.Id)
        {
            throw new InvalidOperationException("Lead is already in the requested stage.");
        }

        var currentHistory = await _dbContext.LeadStageHistories
            .FirstOrDefaultAsync(
                x => x.LeadId == lead.Id && x.ExitedAtUtc == null,
                cancellationToken)
            ?? throw new InvalidOperationException("Active stage history was not found for the lead.");

        var utcNow = DateTime.UtcNow;
        currentHistory.ExitedAtUtc = utcNow;
        currentHistory.DurationDays = CalculateDurationDays(currentHistory.EnteredAtUtc, utcNow);

        _dbContext.LeadStageHistories.Add(new LeadStageHistory
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            PipelineStageId = targetStage.Id,
            EnteredAtUtc = utcNow
        });

        var previousStageId = lead.CurrentPipelineStageId;
        var previousStageName = lead.CurrentPipelineStage?.Name ?? "Unknown";

        lead.CurrentPipelineStageId = targetStage.Id;
        lead.UpdatedByUserId = userId;

        if (targetStage.IsWonStage)
        {
            lead.Status = LeadStatus.Won;
        }
        else if (targetStage.IsLostStage)
        {
            lead.Status = LeadStatus.Lost;
        }
        else
        {
            lead.Status = LeadStatus.Open;
        }

        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            ContactId = lead.ContactId,
            UserId = userId,
            ActivityType = ActivityType.StageChanged,
            Title = "Lead stage changed",
            Description = $"Lead '{lead.Title}' moved from '{previousStageName}' to '{targetStage.Name}'.",
            CreatedAtUtc = utcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _internalEventPublisher.PublishAsync(
            new LeadStageChangedInternalEvent
            {
                LeadId = lead.Id,
                FromStageId = previousStageId,
                ToStageId = targetStage.Id,
                ChangedByUserId = userId,
                ChangedAtUtc = utcNow
            },
            cancellationToken);

        return await GetLeadByIdAsync(lead.Id, cancellationToken);
    }

    public async Task<LeadStageTimerResponse> GetStageTimerAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var lead = await _dbContext.Leads
            .AsNoTracking()
            .Include(x => x.CurrentPipelineStage)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Lead not found.");

        var histories = await _dbContext.LeadStageHistories
            .AsNoTracking()
            .Where(x => x.LeadId == id)
            .Include(x => x.PipelineStage)
            .OrderBy(x => x.EnteredAtUtc)
            .ToListAsync(cancellationToken);

        var currentHistory = histories.FirstOrDefault(x => x.ExitedAtUtc == null)
            ?? throw new InvalidOperationException("Active stage history was not found for the lead.");

        var utcNow = DateTime.UtcNow;

        return new LeadStageTimerResponse
        {
            LeadId = lead.Id,
            CurrentStageId = lead.CurrentPipelineStageId,
            CurrentStageName = lead.CurrentPipelineStage?.Name ?? string.Empty,
            EnteredAtUtc = currentHistory.EnteredAtUtc,
            DaysInCurrentStage = CalculateDurationDays(currentHistory.EnteredAtUtc, utcNow),
            PreviousStages = histories
                .Where(x => x.ExitedAtUtc != null)
                .Select(x => new LeadStageTimerHistoryResponse
                {
                    StageId = x.PipelineStageId,
                    StageName = x.PipelineStage?.Name ?? string.Empty,
                    EnteredAtUtc = x.EnteredAtUtc,
                    ExitedAtUtc = x.ExitedAtUtc,
                    DurationDays = x.DurationDays ?? CalculateDurationDays(x.EnteredAtUtc, x.ExitedAtUtc!.Value)
                })
                .ToList()
        };
    }

    public async Task<IReadOnlyList<LeadTimelineActivityResponse>> GetTimelineAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var leadExists = await _dbContext.Leads
            .AsNoTracking()
            .AnyAsync(x => x.Id == id, cancellationToken);

        if (!leadExists)
        {
            throw new KeyNotFoundException("Lead not found.");
        }

        return await _dbContext.ActivityLogs
            .AsNoTracking()
            .Where(x => x.LeadId == id)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(activity => new LeadTimelineActivityResponse
            {
                Id = activity.Id,
                ActivityType = activity.ActivityType.ToString(),
                Title = activity.Title,
                Description = activity.Description,
                MetadataJson = activity.MetadataJson,
                UserId = activity.UserId,
                UserFullName = activity.User != null ? activity.User.FullName : null,
                UserEmail = activity.User != null ? activity.User.Email : null,
                CreatedAtUtc = activity.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public Task<LeadDuplicatesResponse> GetDuplicatesAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return _leadDuplicateService.GetDuplicatesAsync(id, cancellationToken);
    }

    private IQueryable<Lead> BuildLeadQuery(LeadListRequest request)
    {
        var query = _dbContext.Leads
            .AsNoTracking()
            .Include(x => x.Contact)
            .Include(x => x.LeadSource)
            .Include(x => x.CurrentPipelineStage)
            .Include(x => x.OwnerUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Title.ToLower().Contains(search) ||
                x.Contact!.FullName.ToLower().Contains(search) ||
                (x.Contact.Email != null && x.Contact.Email.ToLower().Contains(search)) ||
                (x.Contact.Phone != null && x.Contact.Phone.ToLower().Contains(search)));
        }

        if (request.SourceId.HasValue)
        {
            query = query.Where(x => x.LeadSourceId == request.SourceId.Value);
        }

        if (request.StageId.HasValue)
        {
            query = query.Where(x => x.CurrentPipelineStageId == request.StageId.Value);
        }

        if (request.OwnerUserId.HasValue)
        {
            query = query.Where(x => x.OwnerUserId == request.OwnerUserId.Value);
        }

        var status = ParseStatus(request.Status);
        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        return query;
    }

    private async Task<User?> ValidateOwnerAsync(Guid? ownerUserId, CancellationToken cancellationToken)
    {
        if (!ownerUserId.HasValue)
        {
            return null;
        }

        return await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == ownerUserId.Value && x.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("Owner user not found.");
    }

    private async Task<Contact> ResolveCreateContactAsync(
        CreateLeadRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (request.ContactId != Guid.Empty)
        {
            return await _dbContext.Contacts
                .FirstOrDefaultAsync(x => x.Id == request.ContactId, cancellationToken)
                ?? throw new KeyNotFoundException("Contact not found.");
        }

        if (string.IsNullOrWhiteSpace(request.ContactName))
        {
            throw new ArgumentException("Contact is required.");
        }

        var contact = new Contact
        {
            Id = Guid.NewGuid(),
            Salutation = NormalizeOptional(request.ContactSalutation),
            FullName = request.ContactName.Trim(),
            Email = NormalizeOptional(request.ContactEmail),
            Phone = NormalizeOptional(request.ContactPhone),
            CreatedByUserId = userId
        };

        _dbContext.Contacts.Add(contact);

        return contact;
    }

    private static void ValidateLead(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Title is required.");
        }
    }

    private static string BuildInquiryTitle(string? serviceRequested, string contactName, string? fallbackTitle)
    {
        var service = NormalizeOptional(serviceRequested);
        var contact = NormalizeOptional(contactName);

        if (service is not null && contact is not null)
        {
            return $"{service} - {contact}";
        }

        return NormalizeOptional(fallbackTitle)
            ?? contact
            ?? service
            ?? string.Empty;
    }

    private static string NormalizeRequired(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private static LeadStatus? ParseStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        if (Enum.TryParse<LeadStatus>(status.Trim(), true, out var parsedStatus))
        {
            return parsedStatus;
        }

        throw new ArgumentException("Invalid lead status.");
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static int CalculateDurationDays(DateTime enteredAtUtc, DateTime finishedAtUtc)
    {
        return Math.Max(0, (int)Math.Floor((finishedAtUtc - enteredAtUtc).TotalDays));
    }

    private static Expression<Func<Lead, LeadResponse>> MapLead()
    {
        return lead => new LeadResponse
        {
            Id = lead.Id,
            ContactId = lead.ContactId,
            ContactSalutation = lead.Contact!.Salutation,
            ContactFullName = lead.Contact!.FullName,
            ContactEmail = lead.Contact.Email,
            ContactPhone = lead.Contact.Phone,
            LeadSourceId = lead.LeadSourceId,
            LeadSourceName = lead.LeadSource!.Name,
            CurrentPipelineStageId = lead.CurrentPipelineStageId,
            CurrentPipelineStageName = lead.CurrentPipelineStage!.Name,
            OwnerUserId = lead.OwnerUserId,
            OwnerUserFullName = lead.OwnerUser != null ? lead.OwnerUser.FullName : null,
            Title = lead.Title,
            Status = lead.Status.ToString(),
            EstimatedCost = lead.EstimatedCost,
            ServiceRequested = lead.ServiceRequested,
            Message = lead.Message,
            IsDuplicateWarning = lead.IsDuplicateWarning,
            CreatedAtUtc = lead.CreatedAtUtc,
            UpdatedAtUtc = lead.UpdatedAtUtc
        };
    }
}
