namespace Crm.Contracts.Leads;

public sealed class LeadTimelineActivityResponse
{
    public Guid Id { get; set; }

    public string ActivityType { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? MetadataJson { get; set; }

    public Guid? UserId { get; set; }

    public string? UserFullName { get; set; }

    public string? UserEmail { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
