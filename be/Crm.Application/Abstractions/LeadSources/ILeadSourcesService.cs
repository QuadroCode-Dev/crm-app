using Crm.Contracts.LeadSources;

namespace Crm.Application.Abstractions.LeadSources;

public interface ILeadSourcesService
{
    Task<IReadOnlyList<LeadSourceResponse>> GetLeadSourcesAsync(CancellationToken cancellationToken);

    Task<LeadSourceResponse> CreateLeadSourceAsync(
        CreateLeadSourceRequest request,
        CancellationToken cancellationToken);
}
