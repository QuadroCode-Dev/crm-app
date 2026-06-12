using System.Text.Json;
using Crm.Application.Abstractions.Leads;
using Crm.Contracts.Leads;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class LeadDuplicateService : ILeadDuplicateService
{
    private readonly CrmDbContext _dbContext;

    public LeadDuplicateService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LeadDuplicatesResponse> GetDuplicatesAsync(Guid leadId, CancellationToken cancellationToken)
    {
        var lead = await _dbContext.Leads
            .AsNoTracking()
            .Include(x => x.Contact)
            .FirstOrDefaultAsync(x => x.Id == leadId, cancellationToken)
            ?? throw new KeyNotFoundException("Lead not found.");

        return await FindDuplicatesAsync(
            lead.Id,
            lead.ContactId,
            lead.Contact?.Email,
            lead.Contact?.Phone,
            cancellationToken);
    }

    public async Task ApplyDuplicateWarningAsync(
        Lead lead,
        Contact contact,
        Guid? userId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var duplicates = await FindDuplicatesAsync(
            lead.Id,
            contact.Id,
            contact.Email,
            contact.Phone,
            cancellationToken);

        if (!duplicates.HasDuplicates)
        {
            return;
        }

        lead.IsDuplicateWarning = true;
        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            ContactId = contact.Id,
            UserId = userId,
            ActivityType = ActivityType.DuplicateWarningCreated,
            Title = "Duplicate warning created",
            Description = "A possible duplicate lead or contact was found.",
            MetadataJson = JsonSerializer.Serialize(new
            {
                matchedLeadIds = duplicates.MatchedLeads.Select(x => x.Id).ToArray(),
                matchedContactIds = duplicates.MatchedContacts.Select(x => x.Id).ToArray(),
                matchFields = duplicates.MatchFields
            }),
            CreatedAtUtc = utcNow
        });
    }

    private async Task<LeadDuplicatesResponse> FindDuplicatesAsync(
        Guid leadId,
        Guid contactId,
        string? email,
        string? phone,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(email);
        var normalizedPhone = NormalizePhone(phone);
        var matchFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var matchedContacts = new List<Contact>();

        if (normalizedEmail is not null)
        {
            var emailMatches = await _dbContext.Contacts
                .AsNoTracking()
                .Where(x => x.Id != contactId && x.Email != null && x.Email.ToLower() == normalizedEmail)
                .ToListAsync(cancellationToken);

            if (emailMatches.Count > 0)
            {
                matchFields.Add("email");
                matchedContacts.AddRange(emailMatches);
            }
        }

        if (normalizedPhone is not null)
        {
            var phoneCandidates = await _dbContext.Contacts
                .AsNoTracking()
                .Where(x => x.Id != contactId && x.Phone != null)
                .ToListAsync(cancellationToken);

            var phoneMatches = phoneCandidates
                .Where(x => NormalizePhone(x.Phone) == normalizedPhone)
                .ToList();

            if (phoneMatches.Count > 0)
            {
                matchFields.Add("phone");
                matchedContacts.AddRange(phoneMatches);
            }
        }

        matchedContacts = matchedContacts
            .GroupBy(x => x.Id)
            .Select(x => x.First())
            .ToList();

        var sameContactLeads = await _dbContext.Leads
            .AsNoTracking()
            .Where(x => x.Id != leadId && x.ContactId == contactId)
            .ToListAsync(cancellationToken);

        if (sameContactLeads.Count > 0)
        {
            if (normalizedEmail is not null)
            {
                matchFields.Add("email");
            }

            if (normalizedPhone is not null)
            {
                matchFields.Add("phone");
            }
        }

        var matchedContactIds = matchedContacts.Select(x => x.Id).ToList();
        var matchedLeads = matchedContactIds.Count == 0
            ? sameContactLeads
            : sameContactLeads
                .Concat(await _dbContext.Leads
                    .AsNoTracking()
                    .Where(x => x.Id != leadId && matchedContactIds.Contains(x.ContactId))
                    .ToListAsync(cancellationToken))
                .GroupBy(x => x.Id)
                .Select(x => x.First())
                .ToList();

        return new LeadDuplicatesResponse
        {
            LeadId = leadId,
            HasDuplicates = matchedContacts.Count > 0 || matchedLeads.Count > 0,
            MatchedContacts = matchedContacts
                .Select(x => new LeadDuplicateContactResponse
                {
                    Id = x.Id,
                    FullName = x.FullName,
                    Email = x.Email,
                    Phone = x.Phone
                })
                .ToList(),
            MatchedLeads = matchedLeads
                .Select(x => new LeadDuplicateLeadResponse
                {
                    Id = x.Id,
                    ContactId = x.ContactId,
                    Title = x.Title,
                    Status = x.Status.ToString(),
                    CreatedAtUtc = x.CreatedAtUtc
                })
                .ToList(),
            MatchFields = matchFields
                .OrderBy(x => x)
                .ToList()
        };
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
        if (string.IsNullOrWhiteSpace(digits))
        {
            return null;
        }

        return digits.Length > 10 ? digits[^10..] : digits.TrimStart('0');
    }
}
