using Crm.Domain.Common;

namespace Crm.Domain.Entities;

public class Contact : SoftDeleteEntity
{
    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? CompanyName { get; set; }

    public ICollection<Lead> Leads { get; set; } = new List<Lead>();

    public ICollection<Note> Notes { get; set; } = new List<Note>();

    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();

    public ICollection<ActivityLog> Activities { get; set; } = new List<ActivityLog>();
}
// Represents a person/company in the CRM.