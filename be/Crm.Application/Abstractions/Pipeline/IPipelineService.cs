using Crm.Contracts.Pipeline;

namespace Crm.Application.Abstractions.Pipeline;

public interface IPipelineService
{
    Task<IReadOnlyList<PipelineStageResponse>> GetStagesAsync(CancellationToken cancellationToken);

    Task<PipelineStageResponse> CreateStageAsync(
        CreatePipelineStageRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<PipelineStageResponse> UpdateStageAsync(
        Guid id,
        UpdatePipelineStageRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task DeleteStageAsync(
        Guid id,
        DeletePipelineStageRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PipelineStageResponse>> ReorderStagesAsync(
        ReorderPipelineStagesRequest request,
        Guid userId,
        CancellationToken cancellationToken);
}
