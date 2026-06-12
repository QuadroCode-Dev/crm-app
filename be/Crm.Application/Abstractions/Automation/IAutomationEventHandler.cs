using Crm.Application.Events;

namespace Crm.Application.Abstractions.Automation;

public interface IAutomationEventHandler
{
    Task HandleAsync(LeadStageChangedInternalEvent @event, CancellationToken cancellationToken);
}
