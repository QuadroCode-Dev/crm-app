namespace Crm.Contracts.Tasks;

public sealed class TaskListRequest
{
    public Guid? AssignedToUserId { get; set; }

    public string? Status { get; set; }

    public string? Priority { get; set; }

    public DateTime? DueFromUtc { get; set; }

    public DateTime? DueToUtc { get; set; }

    public bool OverdueOnly { get; set; }

    public Guid? LeadId { get; set; }

    public Guid? ContactId { get; set; }
}
