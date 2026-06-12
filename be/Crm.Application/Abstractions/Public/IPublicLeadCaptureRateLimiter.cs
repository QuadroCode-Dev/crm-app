namespace Crm.Application.Abstractions.Public;

public interface IPublicLeadCaptureRateLimiter
{
    bool TryConsume(string clientKey);
}
