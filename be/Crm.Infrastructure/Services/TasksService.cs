using System.Linq.Expressions;
using Crm.Application.Abstractions.Tasks;
using Crm.Contracts.Tasks;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainTaskStatus = Crm.Domain.Enums.TaskStatus;

namespace Crm.Infrastructure.Services;

public sealed class TasksService : ITasksService
{
    private readonly CrmDbContext _dbContext;

    public TasksService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<TaskResponse>> GetTasksAsync(
        TaskListRequest request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.TaskItems
            .AsNoTracking()
            .Include(x => x.AssignedToUser)
            .AsQueryable();

        if (request.AssignedToUserId.HasValue)
        {
            query = query.Where(x => x.AssignedToUserId == request.AssignedToUserId.Value);
        }

        if (request.LeadId.HasValue)
        {
            query = query.Where(x => x.LeadId == request.LeadId.Value);
        }

        if (request.ContactId.HasValue)
        {
            query = query.Where(x => x.ContactId == request.ContactId.Value);
        }

        var status = ParseStatus(request.Status);
        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var priority = ParsePriority(request.Priority);
        if (priority.HasValue)
        {
            query = query.Where(x => x.Priority == priority.Value);
        }

        if (request.DueFromUtc.HasValue)
        {
            query = query.Where(x => x.DueAtUtc >= request.DueFromUtc.Value);
        }

        if (request.DueToUtc.HasValue)
        {
            query = query.Where(x => x.DueAtUtc <= request.DueToUtc.Value);
        }

        if (request.OverdueOnly)
        {
            var utcNow = DateTime.UtcNow;
            query = query.Where(x =>
                x.DueAtUtc.HasValue &&
                x.DueAtUtc.Value < utcNow &&
                x.Status != DomainTaskStatus.Done);
        }

        return await query
            .OrderBy(x => x.DueAtUtc ?? DateTime.MaxValue)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(MapTask())
            .ToListAsync(cancellationToken);
    }

    public async Task<TaskResponse> GetTaskByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var task = await _dbContext.TaskItems
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapTask())
            .FirstOrDefaultAsync(cancellationToken);

        return task ?? throw new KeyNotFoundException("Task not found.");
    }

    public async Task<TaskResponse> CreateTaskAsync(
        CreateTaskRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateTaskTitle(request.Title);

        var priority = ParsePriority(request.Priority) ?? TaskPriority.Medium;
        var status = ParseStatus(request.Status) ?? DomainTaskStatus.Pending;
        var relation = await ValidateRelationsAsync(
            request.LeadId,
            request.ContactId,
            request.AssignedToUserId,
            cancellationToken);

        var utcNow = DateTime.UtcNow;
        var taskItem = new TaskItem
        {
            Id = Guid.NewGuid(),
            LeadId = relation.LeadId,
            ContactId = relation.ContactId,
            AssignedToUserId = relation.AssignedToUserId,
            Title = request.Title.Trim(),
            Description = NormalizeOptional(request.Description),
            DueAtUtc = request.DueAtUtc,
            Priority = priority,
            Status = status,
            CompletedAtUtc = status == DomainTaskStatus.Done ? utcNow : null,
            CreatedByUserId = userId
        };

        _dbContext.TaskItems.Add(taskItem);
        _dbContext.ActivityLogs.Add(CreateActivityLog(
            taskItem.LeadId,
            taskItem.ContactId,
            userId,
            ActivityType.TaskCreated,
            "Task created",
            $"Task '{taskItem.Title}' was created."));

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetTaskByIdAsync(taskItem.Id, cancellationToken);
    }

    public async Task<TaskResponse> UpdateTaskAsync(
        Guid id,
        UpdateTaskRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateTaskTitle(request.Title);

        var taskItem = await _dbContext.TaskItems
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Task not found.");

        var priority = ParsePriority(request.Priority) ?? TaskPriority.Medium;
        var status = ParseStatus(request.Status) ?? DomainTaskStatus.Pending;
        var relation = await ValidateRelationsAsync(
            request.LeadId,
            request.ContactId,
            request.AssignedToUserId,
            cancellationToken);

        taskItem.LeadId = relation.LeadId;
        taskItem.ContactId = relation.ContactId;
        taskItem.AssignedToUserId = relation.AssignedToUserId;
        taskItem.Title = request.Title.Trim();
        taskItem.Description = NormalizeOptional(request.Description);
        taskItem.DueAtUtc = request.DueAtUtc;
        taskItem.Priority = priority;
        taskItem.Status = status;
        taskItem.CompletedAtUtc = status == DomainTaskStatus.Done
            ? taskItem.CompletedAtUtc ?? DateTime.UtcNow
            : null;
        taskItem.UpdatedByUserId = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetTaskByIdAsync(taskItem.Id, cancellationToken);
    }

    public async Task<TaskResponse> CompleteTaskAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var taskItem = await _dbContext.TaskItems
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Task not found.");

        var completedAtUtc = DateTime.UtcNow;
        taskItem.Status = DomainTaskStatus.Done;
        taskItem.CompletedAtUtc = completedAtUtc;
        taskItem.UpdatedByUserId = userId;

        _dbContext.ActivityLogs.Add(CreateActivityLog(
            taskItem.LeadId,
            taskItem.ContactId,
            userId,
            ActivityType.TaskCompleted,
            "Task completed",
            $"Task '{taskItem.Title}' was completed.",
            completedAtUtc));

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetTaskByIdAsync(taskItem.Id, cancellationToken);
    }

    public async Task DeleteTaskAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var taskItem = await _dbContext.TaskItems
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Task not found.");

        taskItem.DeletedByUserId = userId;
        _dbContext.TaskItems.Remove(taskItem);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<(Guid? LeadId, Guid? ContactId, Guid? AssignedToUserId)> ValidateRelationsAsync(
        Guid? leadId,
        Guid? contactId,
        Guid? assignedToUserId,
        CancellationToken cancellationToken)
    {
        if (leadId.HasValue)
        {
            var lead = await _dbContext.Leads
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == leadId.Value, cancellationToken)
                ?? throw new KeyNotFoundException("Lead not found.");

            contactId ??= lead.ContactId;
        }

        if (contactId.HasValue)
        {
            var contactExists = await _dbContext.Contacts
                .AsNoTracking()
                .AnyAsync(x => x.Id == contactId.Value, cancellationToken);

            if (!contactExists)
            {
                throw new KeyNotFoundException("Contact not found.");
            }
        }

        if (assignedToUserId.HasValue)
        {
            var userExists = await _dbContext.Users
                .AsNoTracking()
                .AnyAsync(x => x.Id == assignedToUserId.Value && x.IsActive, cancellationToken);

            if (!userExists)
            {
                throw new KeyNotFoundException("Assigned user not found.");
            }
        }

        return (leadId, contactId, assignedToUserId);
    }

    private static void ValidateTaskTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Task title is required.");
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static TaskPriority? ParsePriority(string? priority)
    {
        if (string.IsNullOrWhiteSpace(priority))
        {
            return null;
        }

        if (Enum.TryParse<TaskPriority>(priority.Trim(), true, out var parsedPriority))
        {
            return parsedPriority;
        }

        throw new ArgumentException("Invalid task priority.");
    }

    private static DomainTaskStatus? ParseStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        if (Enum.TryParse<DomainTaskStatus>(status.Trim(), true, out var parsedStatus))
        {
            return parsedStatus;
        }

        throw new ArgumentException("Invalid task status.");
    }

    private static ActivityLog CreateActivityLog(
        Guid? leadId,
        Guid? contactId,
        Guid userId,
        ActivityType activityType,
        string title,
        string description,
        DateTime? createdAtUtc = null)
    {
        return new ActivityLog
        {
            Id = Guid.NewGuid(),
            LeadId = leadId,
            ContactId = contactId,
            UserId = userId,
            ActivityType = activityType,
            Title = title,
            Description = description,
            CreatedAtUtc = createdAtUtc ?? DateTime.UtcNow
        };
    }

    private static Expression<Func<TaskItem, TaskResponse>> MapTask()
    {
        return task => new TaskResponse
        {
            Id = task.Id,
            LeadId = task.LeadId,
            ContactId = task.ContactId,
            AssignedToUserId = task.AssignedToUserId,
            AssignedToUserFullName = task.AssignedToUser != null ? task.AssignedToUser.FullName : null,
            Title = task.Title,
            Description = task.Description,
            DueAtUtc = task.DueAtUtc,
            Priority = task.Priority.ToString(),
            Status = task.Status.ToString(),
            CreatedAtUtc = task.CreatedAtUtc,
            UpdatedAtUtc = task.UpdatedAtUtc,
            CompletedAtUtc = task.CompletedAtUtc
        };
    }
}
