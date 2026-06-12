using Crm.Contracts.Tasks;

namespace Crm.Application.Abstractions.Tasks;

public interface ITasksService
{
    Task<IReadOnlyList<TaskResponse>> GetTasksAsync(
        TaskListRequest request,
        CancellationToken cancellationToken);

    Task<TaskResponse> GetTaskByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<TaskResponse> CreateTaskAsync(
        CreateTaskRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<TaskResponse> UpdateTaskAsync(
        Guid id,
        UpdateTaskRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<TaskResponse> CompleteTaskAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken);

    Task DeleteTaskAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken);
}
