namespace Crm.Contracts.Leads;

public sealed class LeadResponse
{
    public Guid Id { get; set; }

    public Guid ContactId { get; set; }

    public string ContactFullName { get; set; } = string.Empty;

    public string? ContactEmail { get; set; }

    public string? ContactPhone { get; set; }

    public Guid LeadSourceId { get; set; }

    public string LeadSourceName { get; set; } = string.Empty;

    public Guid CurrentPipelineStageId { get; set; }

    public string CurrentPipelineStageName { get; set; } = string.Empty;

    public Guid? OwnerUserId { get; set; }

    public string? OwnerUserFullName { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public decimal? EstimatedCost { get; set; }

    public string? ServiceRequested { get; set; }

    public string? Message { get; set; }

    public bool IsDuplicateWarning { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
