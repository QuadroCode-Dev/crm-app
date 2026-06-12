namespace Crm.Contracts.Pipeline;

public sealed class DeletePipelineStageRequest
{
    public Guid? ReplacementStageId { get; set; }
}
