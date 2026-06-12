namespace Crm.Contracts.Contacts;

public sealed class CreateContactRequest
{
    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? CompanyName { get; set; }
}
