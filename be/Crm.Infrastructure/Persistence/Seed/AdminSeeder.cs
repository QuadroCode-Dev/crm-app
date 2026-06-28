using Crm.Application.Abstractions.Auth;
using Crm.Domain.Entities;
using Crm.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Crm.Infrastructure.Persistence.Seed;

public static class AdminSeeder
{
    public static async Task SeedAsync(
        CrmDbContext dbContext,
        IConfiguration configuration,
        IPasswordHasher passwordHasher)
    {
        var email = configuration["CRM_ADMIN_EMAIL"];
        var password = configuration["CRM_ADMIN_PASSWORD"];
        var fullName = configuration["CRM_ADMIN_FULL_NAME"];

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(fullName))
        {
            return;
        }

        var existingAdmin = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower());

        if (existingAdmin is not null)
        {
            if (existingAdmin.Role != UserRole.SuperAdmin)
            {
                existingAdmin.Role = UserRole.SuperAdmin;
                existingAdmin.IsActive = true;
                await dbContext.SaveChangesAsync();
            }

            return;
        }

        var admin = new User
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHasher.Hash(password),
            Role = UserRole.SuperAdmin,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Users.Add(admin);

        await dbContext.SaveChangesAsync();
    }
}

/*
This:

reads env vars
checks if admin exists
hashes password
creates admin automatically
A seeder is startup code that automatically inserts default data into the database.
*/

/*
Seeders are commonly used for:

admin users
default roles
default settings
default pipeline stages
test/demo data
*/
