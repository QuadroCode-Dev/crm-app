using System.Linq.Expressions;
using Crm.Application.Abstractions.LeadSources;
using Crm.Contracts.LeadSources;
using Crm.Domain.Entities;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Services;

public sealed class LeadSourcesService : ILeadSourcesService
{
    private readonly CrmDbContext _dbContext;

    public LeadSourcesService(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<LeadSourceResponse>> GetLeadSourcesAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.LeadSources
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(MapLeadSource())
            .ToListAsync(cancellationToken);
    }

    public async Task<LeadSourceResponse> CreateLeadSourceAsync(
        CreateLeadSourceRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Lead source name is required.");
        }

        var name = request.Name.Trim();
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? GenerateCode(name)
            : GenerateCode(request.Code);

        var codeExists = await _dbContext.LeadSources
            .AnyAsync(x => x.Code == code, cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("Lead source code must be unique.");
        }

        var leadSource = new LeadSource
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = code,
            IsSystem = false,
            IsActive = request.IsActive
        };

        _dbContext.LeadSources.Add(leadSource);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LeadSourceResponse
        {
            Id = leadSource.Id,
            Name = leadSource.Name,
            Code = leadSource.Code,
            IsSystem = leadSource.IsSystem,
            IsActive = leadSource.IsActive
        };
    }

    private static string GenerateCode(string value)
    {
        var normalized = new string(value
            .Trim()
            .ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '_')
            .ToArray());

        while (normalized.Contains("__", StringComparison.Ordinal))
        {
            normalized = normalized.Replace("__", "_", StringComparison.Ordinal);
        }

        normalized = normalized.Trim('_');

        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("Lead source code is invalid.");
        }

        return normalized;
    }

    private static Expression<Func<LeadSource, LeadSourceResponse>> MapLeadSource()
    {
        return source => new LeadSourceResponse
        {
            Id = source.Id,
            Name = source.Name,
            Code = source.Code,
            IsSystem = source.IsSystem,
            IsActive = source.IsActive
        };
    }
}
