using System.Security.Claims;
using Crm.Application.Abstractions.Notes;
using Crm.Contracts.Notes;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class NotesController : ControllerBase
{
    private readonly INotesService _notesService;

    public NotesController(INotesService notesService)
    {
        _notesService = notesService;
    }

    [HttpGet("leads/{leadId:guid}/notes")]
    public async Task<ActionResult<IReadOnlyList<NoteResponse>>> GetLeadNotes(
        Guid leadId,
        CancellationToken cancellationToken)
    {
        var response = await _notesService.GetLeadNotesAsync(leadId, cancellationToken);
        return Ok(response);
    }

    [HttpPost("leads/{leadId:guid}/notes")]
    public async Task<ActionResult<NoteResponse>> CreateLeadNote(
        Guid leadId,
        [FromBody] CreateLeadNoteRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _notesService.CreateLeadNoteAsync(
            leadId,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetLeadNotes), new { leadId }, response);
    }

    [HttpPut("notes/{id:guid}")]
    public async Task<ActionResult<NoteResponse>> UpdateNote(
        Guid id,
        [FromBody] UpdateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _notesService.UpdateNoteAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpDelete("notes/{id:guid}")]
    public async Task<IActionResult> DeleteNote(
        Guid id,
        CancellationToken cancellationToken)
    {
        await _notesService.DeleteNoteAsync(id, GetCurrentUserId(), cancellationToken);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Authenticated user id was not found.");
        }

        return userId;
    }
}
