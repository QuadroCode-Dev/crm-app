using Crm.Application.Abstractions.Public;
using Crm.Contracts.Public;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public sealed class PublicController : ControllerBase
{
    private readonly IPublicLeadCaptureService _publicLeadCaptureService;

    public PublicController(IPublicLeadCaptureService publicLeadCaptureService)
    {
        _publicLeadCaptureService = publicLeadCaptureService;
    }

    [HttpPost("lead-capture")]
    public async Task<ActionResult<LeadCaptureResponse>> CaptureLead(
        [FromBody] LeadCaptureRequest request,
        CancellationToken cancellationToken)
    {
        var clientKey = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var response = await _publicLeadCaptureService.CaptureAsync(
            request,
            clientKey,
            cancellationToken);

        return Ok(response);
    }
}
