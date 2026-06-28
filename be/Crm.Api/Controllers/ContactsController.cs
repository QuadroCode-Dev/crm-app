using System.Security.Claims;
using Crm.Application.Abstractions.Contacts;
using Crm.Contracts.Common;
using Crm.Contracts.Contacts;
using Crm.Domain.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/contacts")]
public sealed class ContactsController : ControllerBase
{
    private readonly IContactsService _contactsService;

    public ContactsController(IContactsService contactsService)
    {
        _contactsService = contactsService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<ContactResponse>>> GetContacts(
        [FromQuery] ContactListRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _contactsService.GetContactsAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ContactResponse>> GetContact(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response = await _contactsService.GetContactByIdAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.ContactsCreate)]
    public async Task<ActionResult<ContactResponse>> CreateContact(
        [FromBody] CreateContactRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _contactsService.CreateContactAsync(
            request,
            GetCurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetContact), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = CrmPermissions.ContactsEdit)]
    public async Task<ActionResult<ContactResponse>> UpdateContact(
        Guid id,
        [FromBody] UpdateContactRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _contactsService.UpdateContactAsync(
            id,
            request,
            GetCurrentUserId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = CrmPermissions.ContactsDelete)]
    public async Task<IActionResult> DeleteContact(
        Guid id,
        CancellationToken cancellationToken)
    {
        await _contactsService.DeleteContactAsync(id, GetCurrentUserId(), cancellationToken);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Authenticated user id was not found.");
        }

        return userId;
    }
}
