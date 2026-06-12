using Crm.Contracts.Common;
using Crm.Contracts.Leads;

namespace Crm.Application.Abstractions.Leads;

public interface ILeadsService
{
    Task<PagedResponse<LeadResponse>> GetLeadsAsync(
        LeadListRequest request,
        CancellationToken cancellationToken);

    Task<LeadResponse> GetLeadByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<LeadResponse> CreateLeadAsync(
        CreateLeadRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<LeadResponse> UpdateLeadAsync(
        Guid id,
        UpdateLeadRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task DeleteLeadAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken);

    Task<LeadResponse> ChangeStageAsync(
        Guid id,
        ChangeLeadStageRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<LeadStageTimerResponse> GetStageTimerAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<LeadTimelineActivityResponse>> GetTimelineAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<LeadDuplicatesResponse> GetDuplicatesAsync(
        Guid id,
        CancellationToken cancellationToken);
}
