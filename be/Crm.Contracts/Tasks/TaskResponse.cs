namespace Crm.Contracts.Tasks;

public sealed class TaskResponse
{
    public Guid Id { get; set; }

    public Guid? LeadId { get; set; }

    public Guid? ContactId { get; set; }

    public Guid? AssignedToUserId { get; set; }

    public string? AssignedToUserFullName { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueAtUtc { get; set; }

    public string Priority { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public DateTime? CompletedAtUtc { get; set; }
}
