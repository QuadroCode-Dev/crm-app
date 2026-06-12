using Crm.Contracts.Common;
using Crm.Contracts.Contacts;

namespace Crm.Application.Abstractions.Contacts;

public interface IContactsService
{
    Task<PagedResponse<ContactResponse>> GetContactsAsync(
        ContactListRequest request,
        CancellationToken cancellationToken);

    Task<ContactResponse> GetContactByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<ContactResponse> CreateContactAsync(
        CreateContactRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task<ContactResponse> UpdateContactAsync(
        Guid id,
        UpdateContactRequest request,
        Guid userId,
        CancellationToken cancellationToken);

    Task DeleteContactAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken);
}
