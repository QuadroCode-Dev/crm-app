namespace Crm.Contracts.Users;

public sealed class UpdateRolePermissionsRequest
{
    public IReadOnlyList<string> Permissions { get; set; } = Array.Empty<string>();
}
