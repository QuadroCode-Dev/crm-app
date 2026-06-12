namespace Crm.Contracts.LeadSources;

public sealed class LeadSourceResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public bool IsSystem { get; set; }

    public bool IsActive { get; set; }
}
