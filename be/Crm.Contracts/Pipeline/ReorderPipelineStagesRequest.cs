namespace Crm.Contracts.Pipeline;

public sealed class ReorderPipelineStagesRequest
{
    public IReadOnlyList<PipelineStageReorderItemRequest> Stages { get; set; } = Array.Empty<PipelineStageReorderItemRequest>();
}
