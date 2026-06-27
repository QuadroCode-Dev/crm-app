namespace Crm.Contracts.Pipeline;

public sealed class UpdatePipelineStageRequest
{
    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string? Color { get; set; }

    public int RottingThresholdHours { get; set; } = 168;

    public bool IsDefault { get; set; }

    public bool IsWonStage { get; set; }

    public bool IsLostStage { get; set; }

    public bool IsActive { get; set; } = true;
}
