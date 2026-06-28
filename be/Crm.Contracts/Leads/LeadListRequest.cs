namespace Crm.Contracts.Leads;

public sealed class LeadListRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public string? Search { get; set; }

    public Guid? SourceId { get; set; }

    public Guid? StageId { get; set; }

    public string? Status { get; set; }

    public Guid? OwnerUserId { get; set; }

    public Guid? ContactId { get; set; }
}
