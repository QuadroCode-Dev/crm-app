using Crm.Domain.Common;

namespace Crm.Domain.Entities;

public class LeadSource : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public bool IsSystem { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Lead> Leads { get; set; } = new List<Lead>();
}
// Represents where the lead came from.