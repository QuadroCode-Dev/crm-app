namespace Crm.Contracts.Tasks;

public sealed class CreateTaskRequest
{
    public Guid? LeadId { get; set; }

    public Guid? ContactId { get; set; }

    public Guid? AssignedToUserId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueAtUtc { get; set; }

    public string Priority { get; set; } = "Medium";

    public string Status { get; set; } = "Pending";
}
