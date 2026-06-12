using Crm.Domain.Common;
using Crm.Domain.Enums;

namespace Crm.Domain.Entities;

public class ActivityLog : BaseEntity
{
    public Guid? LeadId { get; set; }

    public Lead? Lead { get; set; }

    public Guid? ContactId { get; set; }

    public Contact? Contact { get; set; }

    public Guid? UserId { get; set; }

    public User? User { get; set; }

    public ActivityType ActivityType { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? MetadataJson { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
// Represents CRM activity history/timeline.