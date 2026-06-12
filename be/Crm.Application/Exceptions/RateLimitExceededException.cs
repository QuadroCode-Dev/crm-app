namespace Crm.Application.Exceptions;

public sealed class RateLimitExceededException : Exception
{
    public RateLimitExceededException(string message)
        : base(message)
    {
    }
}
