using System.Collections.Concurrent;
using Crm.Application.Abstractions.Public;

namespace Crm.Infrastructure.Services;

public sealed class InMemoryPublicLeadCaptureRateLimiter : IPublicLeadCaptureRateLimiter
{
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private const int MaxRequestsPerWindow = 20;

    private readonly ConcurrentDictionary<string, Queue<DateTime>> _requests = new();

    public bool TryConsume(string clientKey)
    {
        var key = string.IsNullOrWhiteSpace(clientKey) ? "anonymous" : clientKey.Trim();
        var utcNow = DateTime.UtcNow;
        var queue = _requests.GetOrAdd(key, _ => new Queue<DateTime>());

        lock (queue)
        {
            while (queue.Count > 0 && utcNow - queue.Peek() > Window)
            {
                queue.Dequeue();
            }

            if (queue.Count >= MaxRequestsPerWindow)
            {
                return false;
            }

            queue.Enqueue(utcNow);
            return true;
        }
    }
}
