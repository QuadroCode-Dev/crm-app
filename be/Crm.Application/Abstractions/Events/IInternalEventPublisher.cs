namespace Crm.Application.Abstractions.Events;

public interface IInternalEventPublisher
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken);
}
