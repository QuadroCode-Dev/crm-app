using Crm.Contracts.Leads;
using Crm.Domain.Entities;

namespace Crm.Application.Abstractions.Leads;

public interface ILeadDuplicateService
{
    Task<LeadDuplicatesResponse> GetDuplicatesAsync(Guid leadId, CancellationToken cancellationToken);

    Task ApplyDuplicateWarningAsync(
        Lead lead,
        Contact contact,
        Guid? userId,
        DateTime utcNow,
        CancellationToken cancellationToken);
}
