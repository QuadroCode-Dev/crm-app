using Crm.Domain.Common;

namespace Crm.Domain.Entities;

public class Service : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
