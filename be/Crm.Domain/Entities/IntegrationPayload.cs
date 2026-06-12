using Crm.Domain.Common;
using Crm.Domain.Enums;

namespace Crm.Domain.Entities;

public class IntegrationPayload : BaseEntity
{
    public string Source { get; set; } = string.Empty;

    public string? ExternalReference { get; set; }

    public string RawJson { get; set; } = string.Empty;

    public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessedAtUtc { get; set; }

    public IntegrationPayloadStatus Status { get; set; } = IntegrationPayloadStatus.Received;

    public string? ErrorMessage { get; set; }

    public Guid? CreatedLeadId { get; set; }

    public Lead? CreatedLead { get; set; }
}
// Stores raw incoming integration data.