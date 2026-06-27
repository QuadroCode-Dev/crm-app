namespace Crm.Contracts.Services;

public sealed class UpdateServiceRequest
{
    public string Name { get; set; } = string.Empty;

    public decimal? EstimatedCost { get; set; }

    public bool IsActive { get; set; } = true;
}
