using Crm.Contracts.Public;

namespace Crm.Application.Abstractions.Public;

public interface IPublicLeadCaptureService
{
    Task<LeadCaptureResponse> CaptureAsync(
        LeadCaptureRequest request,
        string clientKey,
        CancellationToken cancellationToken);
}
