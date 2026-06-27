using System.Text.RegularExpressions;
using Crm.Contracts.Services;
using Crm.Domain.Entities;
using Crm.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/services")]
public sealed class ServicesController : ControllerBase
{
    private static readonly Regex NonCodeCharactersRegex = new("[^a-z0-9]+", RegexOptions.Compiled);
    private readonly CrmDbContext _dbContext;

    public ServicesController(CrmDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ServiceResponse>>> GetServices(
        CancellationToken cancellationToken)
    {
        var services = await _dbContext.Services
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => ToResponse(x))
            .ToListAsync(cancellationToken);

        return Ok(services);
    }

    [HttpGet("all")]
    public async Task<ActionResult<IReadOnlyList<ServiceResponse>>> GetAllServices(
        CancellationToken cancellationToken)
    {
        var services = await _dbContext.Services
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => ToResponse(x))
            .ToListAsync(cancellationToken);

        return Ok(services);
    }

    [HttpPost]
    public async Task<ActionResult<ServiceResponse>> CreateService(
        CreateServiceRequest request,
        CancellationToken cancellationToken)
    {
        ValidateService(request.Name, request.EstimatedCost);

        var code = await BuildUniqueCodeAsync(request.Name, null, cancellationToken);
        var service = new Service
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Code = code,
            EstimatedCost = request.EstimatedCost,
            IsActive = request.IsActive
        };

        _dbContext.Services.Add(service);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Created($"/api/services/{service.Id}", ToResponse(service));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServiceResponse>> UpdateService(
        Guid id,
        UpdateServiceRequest request,
        CancellationToken cancellationToken)
    {
        ValidateService(request.Name, request.EstimatedCost);

        var service = await _dbContext.Services
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Service not found.");

        service.Name = request.Name.Trim();
        service.Code = await BuildUniqueCodeAsync(request.Name, id, cancellationToken);
        service.EstimatedCost = request.EstimatedCost;
        service.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(service));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteService(Guid id, CancellationToken cancellationToken)
    {
        var service = await _dbContext.Services
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Service not found.");

        _dbContext.Services.Remove(service);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<string> BuildUniqueCodeAsync(
        string name,
        Guid? currentServiceId,
        CancellationToken cancellationToken)
    {
        var baseCode = ToServiceCode(name);
        var code = baseCode;
        var suffix = 2;

        while (await _dbContext.Services.AnyAsync(
                   x => x.Code == code && (!currentServiceId.HasValue || x.Id != currentServiceId.Value),
                   cancellationToken))
        {
            code = $"{baseCode}_{suffix}";
            suffix++;
        }

        return code;
    }

    private static void ValidateService(string name, decimal? estimatedCost)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Service name is required.");
        }

        if (estimatedCost.HasValue && estimatedCost.Value < 0)
        {
            throw new ArgumentException("Estimated cost cannot be negative.");
        }
    }

    private static string ToServiceCode(string name)
    {
        var normalized = NonCodeCharactersRegex
            .Replace(name.Trim().ToLowerInvariant(), "_")
            .Trim('_');

        return string.IsNullOrWhiteSpace(normalized)
            ? $"service_{Guid.NewGuid():N}"[..20]
            : normalized;
    }

    private static ServiceResponse ToResponse(Service service)
    {
        return new ServiceResponse
        {
            Id = service.Id,
            Name = service.Name,
            Code = service.Code,
            EstimatedCost = service.EstimatedCost,
            IsActive = service.IsActive
        };
    }
}
