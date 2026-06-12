using Crm.Contracts.Notes;

namespace Crm.Application.Abstractions.Notes;

public interface INotesService
{
    Task<IReadOnlyList<NoteResponse>> GetLeadNotesAsync(
        Guid leadId,
        CancellationToken cancellationToken);

    Task<NoteResponse> CreateLeadNoteAsync(
        Guid leadId,
        CreateLeadNoteRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<NoteResponse> UpdateNoteAsync(
        Guid id,
        UpdateNoteRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task DeleteNoteAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken);
}
