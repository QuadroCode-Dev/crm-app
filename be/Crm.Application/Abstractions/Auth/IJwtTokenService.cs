using Crm.Domain.Entities;

namespace Crm.Application.Abstractions.Auth;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user);

    string GenerateRefreshToken();

    DateTime GetAccessTokenExpirationUtc();
}

/* 
Purpose:

creates JWT tokens after successful login

JWT contains:

user id
email
role
*/