namespace Crm.Contracts.Services;

public sealed class ServiceResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public decimal? EstimatedCost { get; set; }

    public bool IsActive { get; set; }
}
