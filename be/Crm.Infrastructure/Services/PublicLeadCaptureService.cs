using System.Text.Json;
using Crm.Application.Abstractions.Leads;
using Crm.Application.Abstractions.Public;
using Crm.Application.Exceptions;
using Crm.Contracts.Public;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using DomainTaskStatus = Crm.Domain.Enums.TaskStatus;

namespace Crm.Infrastructure.Services;

public sealed class PublicLeadCaptureService : IPublicLeadCaptureService
{
    private const string LandingPageSourceCode = "landing_page";
    private readonly CrmDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly IPublicLeadCaptureRateLimiter _rateLimiter;
    private readonly ILeadDuplicateService _leadDuplicateService;

    public PublicLeadCaptureService(
        CrmDbContext dbContext,
        IConfiguration configuration,
        IPublicLeadCaptureRateLimiter rateLimiter,
        ILeadDuplicateService leadDuplicateService)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _rateLimiter = rateLimiter;
        _leadDuplicateService = leadDuplicateService;
    }

    public async Task<LeadCaptureResponse> CaptureAsync(
        LeadCaptureRequest request,
        string clientKey,
        CancellationToken cancellationToken)
    {
        if (!_rateLimiter.TryConsume(clientKey))
        {
            throw new RateLimitExceededException("Too many lead capture requests. Please try again later.");
        }

        var payload = new IntegrationPayload
        {
            Id = Guid.NewGuid(),
            Source = "Landing Page",
            ExternalReference = null,
            RawJson = JsonSerializer.Serialize(request),
            ReceivedAtUtc = DateTime.UtcNow,
            Status = IntegrationPayloadStatus.Received
        };

        _dbContext.IntegrationPayloads.Add(payload);
        await _dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            ValidateRequest(request);

            var utcNow = DateTime.UtcNow;
            var landingPageSource = await _dbContext.LeadSources
                .FirstOrDefaultAsync(
                    x => x.Code == LandingPageSourceCode && x.IsActive,
                    cancellationToken)
                ?? throw new KeyNotFoundException("Landing page lead source is not configured.");

            var defaultStage = await _dbContext.PipelineStages
                .FirstOrDefaultAsync(
                    x => x.IsDefault && x.IsActive,
                    cancellationToken)
                ?? throw new KeyNotFoundException("Default pipeline stage is not configured.");

            var defaultOwnerId = await ResolveDefaultOwnerIdAsync(cancellationToken);
            var contact = await FindOrCreateContactAsync(request, cancellationToken);

            var lead = new Lead
            {
                Id = Guid.NewGuid(),
                ContactId = contact.Id,
                LeadSourceId = landingPageSource.Id,
                CurrentPipelineStageId = defaultStage.Id,
                OwnerUserId = defaultOwnerId,
                Title = BuildLeadTitle(request, contact),
                Status = LeadStatus.Open,
                EstimatedCost = request.EstimatedCost,
                ServiceRequested = NormalizeOptional(request.ServiceRequested),
                Message = NormalizeLeadMessage(request)
            };

            _dbContext.Leads.Add(lead);
            await _leadDuplicateService.ApplyDuplicateWarningAsync(
                lead,
                contact,
                null,
                utcNow,
                cancellationToken);

            _dbContext.LeadStageHistories.Add(new LeadStageHistory
            {
                Id = Guid.NewGuid(),
                LeadId = lead.Id,
                PipelineStageId = defaultStage.Id,
                EnteredAtUtc = utcNow
            });
            _dbContext.ActivityLogs.Add(new ActivityLog
            {
                Id = Guid.NewGuid(),
                LeadId = lead.Id,
                ContactId = contact.Id,
                ActivityType = ActivityType.LandingPageLeadReceived,
                Title = "Landing page lead received",
                Description = $"Landing page lead was received for '{contact.FullName}'.",
                MetadataJson = BuildMetadataJson(request),
                CreatedAtUtc = utcNow
            });
            _dbContext.ActivityLogs.Add(new ActivityLog
            {
                Id = Guid.NewGuid(),
                LeadId = lead.Id,
                ContactId = contact.Id,
                ActivityType = ActivityType.LeadCreated,
                Title = "Lead created",
                Description = $"Lead '{lead.Title}' was created.",
                CreatedAtUtc = utcNow
            });
            _dbContext.TaskItems.Add(new TaskItem
            {
                Id = Guid.NewGuid(),
                LeadId = lead.Id,
                ContactId = contact.Id,
                AssignedToUserId = defaultOwnerId,
                Title = "Contact new landing page lead",
                DueAtUtc = utcNow.AddDays(1),
                Priority = TaskPriority.Medium,
                Status = DomainTaskStatus.Pending
            });
            _dbContext.ActivityLogs.Add(new ActivityLog
            {
                Id = Guid.NewGuid(),
                LeadId = lead.Id,
                ContactId = contact.Id,
                ActivityType = ActivityType.TaskCreated,
                Title = "Task created",
                Description = "Default landing page follow-up task was created.",
                CreatedAtUtc = utcNow
            });

            payload.ProcessedAtUtc = utcNow;
            payload.Status = IntegrationPayloadStatus.Processed;
            payload.CreatedLeadId = lead.Id;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new LeadCaptureResponse
            {
                Success = true,
                TrackingId = payload.Id,
                Message = "Lead received successfully"
            };
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or KeyNotFoundException)
        {
            payload.ProcessedAtUtc = DateTime.UtcNow;
            payload.Status = IntegrationPayloadStatus.Failed;
            payload.ErrorMessage = ex.Message;
            await _dbContext.SaveChangesAsync(cancellationToken);
            throw;
        }
    }

    private async Task<Contact> FindOrCreateContactAsync(LeadCaptureRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        var normalizedPhone = NormalizePhone(request.Phone);

        Contact? existingContact = null;

        if (normalizedEmail is not null)
        {
            existingContact = await _dbContext.Contacts
                .FirstOrDefaultAsync(
                    x => x.Email != null && x.Email.ToLower() == normalizedEmail,
                    cancellationToken);
        }

        if (existingContact is null && normalizedPhone is not null)
        {
            var candidates = await _dbContext.Contacts
                .Where(x => x.Phone != null)
                .ToListAsync(cancellationToken);

            existingContact = candidates
                .FirstOrDefault(x => NormalizePhone(x.Phone) == normalizedPhone);
        }

        if (existingContact is not null)
        {
            if (string.IsNullOrWhiteSpace(existingContact.Email) && normalizedEmail != null)
            {
                existingContact.Email = normalizedEmail;
            }

            if (string.IsNullOrWhiteSpace(existingContact.Phone) && normalizedPhone != null)
            {
                existingContact.Phone = request.Phone!.Trim();
            }

            return existingContact;
        }

        var contact = new Contact
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim()
        };

        _dbContext.Contacts.Add(contact);
        return contact;
    }

    private async Task<Guid?> ResolveDefaultOwnerIdAsync(CancellationToken cancellationToken)
    {
        var configuredOwnerId = _configuration["CRM_DEFAULT_LEAD_OWNER_USER_ID"];
        if (!Guid.TryParse(configuredOwnerId, out var ownerUserId))
        {
            return null;
        }

        var ownerExists = await _dbContext.Users
            .AsNoTracking()
            .AnyAsync(x => x.Id == ownerUserId && x.IsActive, cancellationToken);

        return ownerExists ? ownerUserId : null;
    }

    private static void ValidateRequest(LeadCaptureRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ArgumentException("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.Phone))
        {
            throw new ArgumentException("At least one of email or phone is required.");
        }

        if (!string.IsNullOrWhiteSpace(request.Honeypot))
        {
            throw new ArgumentException("Spam validation failed.");
        }
    }

    private static string BuildLeadTitle(LeadCaptureRequest request, Contact contact)
    {
        var serviceRequested = NormalizeOptional(request.ServiceRequested);
        return serviceRequested is null
            ? $"Landing page lead - {contact.FullName}"
            : $"{serviceRequested} - {contact.FullName}";
    }

    private static string? NormalizeLeadMessage(LeadCaptureRequest request)
    {
        var message = NormalizeOptional(request.Message);
        var pageUrl = NormalizeOptional(request.PageUrl);

        if (message is null && pageUrl is null)
        {
            return null;
        }

        if (message is null)
        {
            return $"Page URL: {pageUrl}";
        }

        if (pageUrl is null)
        {
            return message;
        }

        return $"{message}\nPage URL: {pageUrl}";
    }

    private static string BuildMetadataJson(LeadCaptureRequest request)
    {
        return JsonSerializer.Serialize(new
        {
            request.UtmSource,
            request.UtmMedium,
            request.UtmCampaign,
            request.PageUrl
        });
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NormalizeEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    }

    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return string.IsNullOrWhiteSpace(digits) ? null : digits;
    }
}
