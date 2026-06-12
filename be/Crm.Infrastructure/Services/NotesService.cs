using System.Linq.Expressions;
using Crm.Application.Abstractions.Notes;
using Crm.Contracts.Notes;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class NotesService : INotesService
{
    private readonly CrmDbContext _dbContext;

    public NotesService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<NoteResponse>> GetLeadNotesAsync(
        Guid leadId,
        CancellationToken cancellationToken)
    {
        await EnsureLeadExistsAsync(leadId, cancellationToken);

        return await _dbContext.Notes
            .AsNoTracking()
            .Where(x => x.LeadId == leadId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(MapNote())
            .ToListAsync(cancellationToken);
    }

    public async Task<NoteResponse> CreateLeadNoteAsync(
        Guid leadId,
        CreateLeadNoteRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateBody(request.Body);

        var lead = await _dbContext.Leads
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == leadId, cancellationToken)
            ?? throw new KeyNotFoundException("Lead not found.");

        var utcNow = DateTime.UtcNow;
        var note = new Note
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            ContactId = lead.ContactId,
            UserId = userId,
            Body = request.Body.Trim(),
            CreatedByUserId = userId
        };

        _dbContext.Notes.Add(note);
        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = lead.Id,
            ContactId = lead.ContactId,
            UserId = userId,
            ActivityType = ActivityType.NoteAdded,
            Title = "Note added",
            Description = "A note was added to the lead.",
            CreatedAtUtc = utcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetNoteByIdAsync(note.Id, cancellationToken);
    }

    public async Task<NoteResponse> UpdateNoteAsync(
        Guid id,
        UpdateNoteRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateBody(request.Body);

        var note = await _dbContext.Notes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Note not found.");

        note.Body = request.Body.Trim();
        note.UpdatedByUserId = userId;

        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = note.LeadId,
            ContactId = note.ContactId,
            UserId = userId,
            ActivityType = ActivityType.NoteUpdated,
            Title = "Note updated",
            Description = "A note was updated on the lead.",
            CreatedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetNoteByIdAsync(note.Id, cancellationToken);
    }

    public async Task DeleteNoteAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var note = await _dbContext.Notes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Note not found.");

        note.DeletedByUserId = userId;

        _dbContext.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = note.LeadId,
            ContactId = note.ContactId,
            UserId = userId,
            ActivityType = ActivityType.NoteDeleted,
            Title = "Note deleted",
            Description = "A note was deleted from the lead.",
            CreatedAtUtc = DateTime.UtcNow
        });

        _dbContext.Notes.Remove(note);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureLeadExistsAsync(Guid leadId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Leads.AnyAsync(x => x.Id == leadId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException("Lead not found.");
        }
    }

    private async Task<NoteResponse> GetNoteByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var note = await _dbContext.Notes
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapNote())
            .FirstOrDefaultAsync(cancellationToken);

        return note ?? throw new KeyNotFoundException("Note not found.");
    }

    private static void ValidateBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            throw new ArgumentException("Note body is required.");
        }
    }

    private static Expression<Func<Note, NoteResponse>> MapNote()
    {
        return note => new NoteResponse
        {
            Id = note.Id,
            LeadId = note.LeadId,
            ContactId = note.ContactId,
            UserId = note.UserId,
            UserFullName = note.User != null ? note.User.FullName : null,
            Body = note.Body,
            CreatedAtUtc = note.CreatedAtUtc,
            UpdatedAtUtc = note.UpdatedAtUtc
        };
    }
}
