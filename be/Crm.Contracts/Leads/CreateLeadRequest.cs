namespace Crm.Contracts.Leads;

public sealed class CreateLeadRequest
{
    public Guid ContactId { get; set; }

    public string? ContactName { get; set; }

    public string? ContactEmail { get; set; }

    public string? ContactPhone { get; set; }

    public Guid LeadSourceId { get; set; }

    public Guid CurrentPipelineStageId { get; set; }

    public Guid? OwnerUserId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Status { get; set; }

    public decimal? EstimatedCost { get; set; }

    public string? ServiceRequested { get; set; }

    public string? Message { get; set; }
}
