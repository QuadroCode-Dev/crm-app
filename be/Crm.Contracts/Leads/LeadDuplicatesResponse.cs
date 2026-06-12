namespace Crm.Contracts.Leads;

public sealed class LeadDuplicatesResponse
{
    public Guid LeadId { get; set; }

    public bool HasDuplicates { get; set; }

    public IReadOnlyList<LeadDuplicateContactResponse> MatchedContacts { get; set; } =
        Array.Empty<LeadDuplicateContactResponse>();

    public IReadOnlyList<LeadDuplicateLeadResponse> MatchedLeads { get; set; } =
        Array.Empty<LeadDuplicateLeadResponse>();

    public IReadOnlyList<string> MatchFields { get; set; } = Array.Empty<string>();
}
