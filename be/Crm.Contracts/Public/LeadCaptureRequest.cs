namespace Crm.Contracts.Public;

public sealed class LeadCaptureRequest
{
    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? ServiceRequested { get; set; }

    public decimal? EstimatedCost { get; set; }

    public string? Message { get; set; }

    public string? UtmSource { get; set; }

    public string? UtmMedium { get; set; }

    public string? UtmCampaign { get; set; }

    public string? PageUrl { get; set; }

    public string? Honeypot { get; set; }
}
