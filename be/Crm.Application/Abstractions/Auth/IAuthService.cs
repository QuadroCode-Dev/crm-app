using Crm.Contracts.Auth;

namespace Crm.Application.Abstractions.Auth;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    Task<LoginResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken);

    Task LogoutAsync(RefreshTokenRequest request, CancellationToken cancellationToken);

    Task<MeResponse> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken);
}
// Main authentication business service.