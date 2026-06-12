using Crm.Domain.Common;

namespace Crm.Domain.Entities;

public class Note : SoftDeleteEntity
{
    public Guid? LeadId { get; set; }

    public Lead? Lead { get; set; }

    public Guid? ContactId { get; set; }

    public Contact? Contact { get; set; }

    public Guid? UserId { get; set; }

    public User? User { get; set; }

    public string Body { get; set; } = string.Empty;
}
// Represents notes written by CRM users.