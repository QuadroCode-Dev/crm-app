namespace Crm.Contracts.Contacts;

public sealed class UpdateContactRequest
{
    public string? Salutation { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? CompanyName { get; set; }
}
