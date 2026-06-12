namespace Crm.Contracts.Leads;

public sealed class ChangeLeadStageRequest
{
    public Guid PipelineStageId { get; set; }
}
