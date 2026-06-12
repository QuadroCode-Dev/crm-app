namespace Crm.Application.Abstractions.Auth;

public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string passwordHash);
}
// hashes passwords before saving to DB
// verifies login passwords later