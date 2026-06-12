namespace Crm.Contracts.Reports;

public sealed class LeadsBySourceReportItemResponse
{
    public Guid SourceId { get; set; }

    public string SourceName { get; set; } = string.Empty;

    public int TotalLeads { get; set; }

    public int OpenLeads { get; set; }

    public int WonLeads { get; set; }

    public int LostLeads { get; set; }

    public decimal EstimatedValue { get; set; }
}
