namespace Crm.Contracts.Reports;

public sealed class ReportFilterRequest
{
    public DateTime? DateFrom { get; set; }

    public DateTime? DateTo { get; set; }

    public Guid? SourceId { get; set; }

    public Guid? OwnerUserId { get; set; }
}
