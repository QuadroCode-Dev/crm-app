namespace Crm.Contracts.Pipeline;

public sealed class PipelineStageReorderItemRequest
{
    public Guid Id { get; set; }

    public int SortOrder { get; set; }
}
