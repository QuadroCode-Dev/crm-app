namespace Crm.Contracts.Public;

public sealed class LeadCaptureResponse
{
    public bool Success { get; set; }

    public Guid TrackingId { get; set; }

    public string Message { get; set; } = string.Empty;
}
