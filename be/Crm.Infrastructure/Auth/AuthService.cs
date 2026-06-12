using Crm.Application.Abstractions.Auth;
using Crm.Contracts.Auth;
using Crm.Infrastructure.Persistence;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Crm.Infrastructure.Auth;

public sealed class AuthService : IAuthService
{
    private readonly CrmDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly JwtOptions _jwtOptions;

    public AuthService(
        CrmDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IOptions<JwtOptions> jwtOptions)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<LoginResponse> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Email.ToLower() == email, cancellationToken);

        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var isPasswordValid = _passwordHasher.Verify(
            request.Password,
            user.PasswordHash);

        if (!isPasswordValid)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();
        var now = DateTime.UtcNow;

        user.RefreshTokenHash = HashRefreshToken(refreshToken);
        user.RefreshTokenExpiresAtUtc = now.AddDays(_jwtOptions.RefreshTokenDays);
        user.RefreshTokenRevokedAtUtc = null;
        user.UpdatedAtUtc = now;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAtUtc = _jwtTokenService.GetAccessTokenExpirationUtc()
        };
    }

    public Task<LoginResponse> RefreshAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken)
        => RefreshInternalAsync(request, cancellationToken);

    public Task LogoutAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken)
        => LogoutInternalAsync(request, cancellationToken);

    public async Task<MeResponse> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("User not found.");
        }

        return new MeResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString()
        };
    }

    private async Task<LoginResponse> RefreshInternalAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var tokenHash = HashRefreshToken(request.RefreshToken);

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                x => x.RefreshTokenHash == tokenHash,
                cancellationToken);

        if (user is null ||
            !user.IsActive ||
            user.RefreshTokenRevokedAtUtc is not null ||
            user.RefreshTokenExpiresAtUtc is null ||
            user.RefreshTokenExpiresAtUtc <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        user.RefreshTokenHash = HashRefreshToken(refreshToken);
        user.RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays);
        user.RefreshTokenRevokedAtUtc = null;
        user.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAtUtc = _jwtTokenService.GetAccessTokenExpirationUtc()
        };
    }

    private async Task LogoutInternalAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var tokenHash = HashRefreshToken(request.RefreshToken);

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                x => x.RefreshTokenHash == tokenHash,
                cancellationToken);

        if (user is null)
        {
            return;
        }

        user.RefreshTokenRevokedAtUtc = DateTime.UtcNow;
        user.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string HashRefreshToken(string refreshToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken.Trim()));
        return Convert.ToHexString(bytes);
    }
}

/*
AuthService
-----------
Handles CRM authentication business logic.

Responsibilities:
- Login users
- Verify password hashes
- Generate JWT access tokens
- Generate refresh tokens
- Return current authenticated user info

Uses:
- CrmDbContext for database access
- IPasswordHasher for password verification
- IJwtTokenService for JWT generation

Controllers should call this service instead of containing auth logic directly.
*/
