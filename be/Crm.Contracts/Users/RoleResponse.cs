namespace Crm.Contracts.Users;

public sealed class RoleResponse
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsEditable { get; set; }

    public IReadOnlyList<string> Permissions { get; set; } = Array.Empty<string>();
}
