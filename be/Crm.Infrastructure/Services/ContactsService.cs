using System.Linq.Expressions;
using Crm.Application.Abstractions.Contacts;
using Crm.Contracts.Common;
using Crm.Contracts.Contacts;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class ContactsService : IContactsService
{
    private readonly CrmDbContext _dbContext;

    public ContactsService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResponse<ContactResponse>> GetContactsAsync(
        ContactListRequest request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = _dbContext.Contacts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();

            query = query.Where(x =>
                x.FullName.ToLower().Contains(search) ||
                (x.Email != null && x.Email.ToLower().Contains(search)) ||
                (x.Phone != null && x.Phone.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapContact())
            .ToListAsync(cancellationToken);

        return new PagedResponse<ContactResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<ContactResponse> GetContactByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var contact = await _dbContext.Contacts
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapContact())
            .FirstOrDefaultAsync(cancellationToken);

        return contact ?? throw new KeyNotFoundException("Contact not found.");
    }

    public async Task<ContactResponse> CreateContactAsync(
        CreateContactRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateContact(request.FullName);

        var utcNow = DateTime.UtcNow;
        var contact = new Contact
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = NormalizeOptional(request.Email),
            Phone = NormalizeOptional(request.Phone),
            CompanyName = NormalizeOptional(request.CompanyName),
            CreatedByUserId = userId
        };

        _dbContext.Contacts.Add(contact);
        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            ContactId = contact.Id,
            UserId = userId,
            ActivityType = ActivityType.ContactCreated,
            Title = "Contact created",
            Description = $"Contact '{contact.FullName}' was created.",
            CreatedAtUtc = utcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetContactByIdAsync(contact.Id, cancellationToken);
    }

    public async Task<ContactResponse> UpdateContactAsync(
        Guid id,
        UpdateContactRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateContact(request.FullName);

        var contact = await _dbContext.Contacts
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Contact not found.");

        contact.FullName = request.FullName.Trim();
        contact.Email = NormalizeOptional(request.Email);
        contact.Phone = NormalizeOptional(request.Phone);
        contact.CompanyName = NormalizeOptional(request.CompanyName);
        contact.UpdatedByUserId = userId;

        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            ContactId = contact.Id,
            UserId = userId,
            ActivityType = ActivityType.ContactUpdated,
            Title = "Contact updated",
            Description = $"Contact '{contact.FullName}' was updated.",
            CreatedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetContactByIdAsync(contact.Id, cancellationToken);
    }

    public async Task DeleteContactAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var contact = await _dbContext.Contacts
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Contact not found.");

        contact.DeletedByUserId = userId;

        _dbContext.Contacts.Remove(contact);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateContact(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new ArgumentException("Full name is required.");
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static Expression<Func<Contact, ContactResponse>> MapContact()
    {
        return contact => new ContactResponse
        {
            Id = contact.Id,
            FullName = contact.FullName,
            Email = contact.Email,
            Phone = contact.Phone,
            CompanyName = contact.CompanyName,
            CreatedAtUtc = contact.CreatedAtUtc,
            UpdatedAtUtc = contact.UpdatedAtUtc
        };
    }
}
