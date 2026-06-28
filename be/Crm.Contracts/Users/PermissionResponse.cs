namespace Crm.Contracts.Users;

public sealed class PermissionResponse
{
    public string Code { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string Group { get; set; } = string.Empty;
}
