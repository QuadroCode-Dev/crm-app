using Crm.Application.Abstractions.Auth;

namespace Crm.Infrastructure.Auth;

public sealed class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool Verify(string password, string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}

/*
Hash() converts a plain password into a secure hash.
Verify() checks if the entered password matches the saved hash.
We never store plain passwords in the database.
*/