namespace Crm.Contracts.Leads;

public sealed class LeadDuplicateContactResponse
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Phone { get; set; }
}
