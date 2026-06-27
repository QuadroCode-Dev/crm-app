namespace Crm.Contracts.Pipeline;

public sealed class PipelineStageResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string? Color { get; set; }

    public int RottingThresholdHours { get; set; }

    public bool IsDefault { get; set; }

    public bool IsWonStage { get; set; }

    public bool IsLostStage { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
