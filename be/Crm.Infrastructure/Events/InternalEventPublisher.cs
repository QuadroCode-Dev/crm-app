using Crm.Application.Abstractions.Automation;
using Crm.Application.Abstractions.Events;
using Crm.Application.Events;

namespace Crm.Infrastructure.Events;

public sealed class InternalEventPublisher : IInternalEventPublisher
{
    private readonly IAutomationEventHandler _automationEventHandler;

    public InternalEventPublisher(IAutomationEventHandler automationEventHandler)
    {
        _automationEventHandler = automationEventHandler;
    }

    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken)
    {
        if (@event is LeadStageChangedInternalEvent leadStageChanged)
        {
            return _automationEventHandler.HandleAsync(leadStageChanged, cancellationToken);
        }

        return Task.CompletedTask;
    }
}
