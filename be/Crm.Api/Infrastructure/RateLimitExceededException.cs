namespace Crm.Api.Infrastructure;

public sealed class RateLimitExceededException : Exception
{
    public RateLimitExceededException(string message)
        : base(message)
    {
    }
}
