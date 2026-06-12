using Crm.Domain.Common;
using Crm.Domain.Enums;

namespace Crm.Domain.Entities;

public class TaskItem : SoftDeleteEntity
{
    public Guid? LeadId { get; set; }

    public Lead? Lead { get; set; }

    public Guid? ContactId { get; set; }

    public Contact? Contact { get; set; }

    public Guid? AssignedToUserId { get; set; }

    public User? AssignedToUser { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueAtUtc { get; set; }

    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    public Enums.TaskStatus Status { get; set; } = Enums.TaskStatus.Pending;

    public DateTime? CompletedAtUtc { get; set; }
}
// Represents tasks/reminders.