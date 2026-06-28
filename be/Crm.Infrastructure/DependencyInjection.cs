using Crm.Application.Abstractions.Automation;
using Crm.Application.Abstractions.Auth;
using Crm.Application.Abstractions.Contacts;
using Crm.Application.Abstractions.Events;
using Crm.Application.Abstractions.LeadSources;
using Crm.Application.Abstractions.Leads;
using Crm.Application.Abstractions.Notes;
using Crm.Application.Abstractions.Pipeline;
using Crm.Application.Abstractions.Public;
using Crm.Application.Abstractions.Reports;
using Crm.Application.Abstractions.Tasks;
using Crm.Application.Abstractions.Users;
using Crm.Infrastructure.Auth;
using Crm.Infrastructure.Events;
using Crm.Infrastructure.Persistence;
using Crm.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Crm.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var databaseProvider = configuration["Database:Provider"];

        services.AddDbContext<CrmDbContext>(options =>
        {
            if (string.Equals(databaseProvider, "Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                options.UseSqlite(connectionString);
                return;
            }

            options.UseNpgsql(connectionString);
        });

        services.Configure<JwtOptions>(
            configuration.GetSection(JwtOptions.SectionName));

        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAutomationRulesService, AutomationRulesService>();
        services.AddScoped<IAutomationEventHandler, AutomationEventHandler>();
        services.AddScoped<IContactsService, ContactsService>();
        services.AddScoped<ILeadDuplicateService, LeadDuplicateService>();
        services.AddScoped<ILeadSourcesService, LeadSourcesService>();
        services.AddScoped<ILeadsService, LeadsService>();
        services.AddScoped<INotesService, NotesService>();
        services.AddScoped<IPipelineService, PipelineService>();
        services.AddScoped<IPublicLeadCaptureService, PublicLeadCaptureService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<ITasksService, TasksService>();
        services.AddScoped<IUsersManagementService, UsersManagementService>();
        services.AddSingleton<IPublicLeadCaptureRateLimiter, InMemoryPublicLeadCaptureRateLimiter>();
        services.AddScoped<IInternalEventPublisher, InternalEventPublisher>();

        return services;
    }
}

/*
ConnectionStrings
-----------------
Tells EF Core:
- where PostgreSQL is
- database name
- username/password

JwtOptions
----------
Maps the Jwt section from appsettings.json

AddScoped
---------
Registers services for Dependency Injection
One instance per HTTP request
*/
