using Crm.Application.Abstractions.Events;

namespace Crm.Infrastructure.Events;

public sealed class NoOpInternalEventPublisher : IInternalEventPublisher
{
    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
