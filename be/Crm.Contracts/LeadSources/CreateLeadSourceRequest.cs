namespace Crm.Contracts.LeadSources;

public sealed class CreateLeadSourceRequest
{
    public string Name { get; set; } = string.Empty;

    public string? Code { get; set; }

    public bool IsActive { get; set; } = true;
}
