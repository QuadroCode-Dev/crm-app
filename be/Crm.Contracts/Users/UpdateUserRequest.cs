namespace Crm.Contracts.Users;

public sealed class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = "Agent";

    public bool IsActive { get; set; } = true;
}
