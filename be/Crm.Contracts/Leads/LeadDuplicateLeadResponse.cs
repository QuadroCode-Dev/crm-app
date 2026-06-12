namespace Crm.Contracts.Leads;

public sealed class LeadDuplicateLeadResponse
{
    public Guid Id { get; set; }

    public Guid ContactId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
}
