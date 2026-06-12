namespace Crm.Contracts.Notes;

public sealed class NoteResponse
{
    public Guid Id { get; set; }

    public Guid? LeadId { get; set; }

    public Guid? ContactId { get; set; }

    public Guid? UserId { get; set; }

    public string? UserFullName { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
