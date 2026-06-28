using System.Linq.Expressions;
using Crm.Domain.Common;
using Crm.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Crm.Infrastructure.Persistence;

public class CrmDbContext : DbContext
{
    public CrmDbContext(DbContextOptions<CrmDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<LeadSource> LeadSources => Set<LeadSource>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<PipelineStage> PipelineStages => Set<PipelineStage>();
    public DbSet<LeadStageHistory> LeadStageHistories => Set<LeadStageHistory>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AutomationRule> AutomationRules => Set<AutomationRule>();
    public DbSet<IntegrationPayload> IntegrationPayloads => Set<IntegrationPayload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CrmDbContext).Assembly);
        ApplySoftDeleteQueryFilters(modelBuilder);

        SeedLeadSources(modelBuilder);
        SeedServices(modelBuilder);
        SeedPipelineStages(modelBuilder);
        SeedRolePermissions(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditInformation();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditInformation();
        return base.SaveChanges();
    }

    private static void SeedLeadSources(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LeadSource>().HasData(
            new LeadSource
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Name = "Landing Page",
                Code = "landing_page",
                IsSystem = true,
                IsActive = true
            },
            new LeadSource
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Name = "Manual",
                Code = "manual",
                IsSystem = true,
                IsActive = true
            },
            new LeadSource
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Name = "Website",
                Code = "website",
                IsSystem = false,
                IsActive = true
            },
            new LeadSource
            {
                Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                Name = "Referral",
                Code = "referral",
                IsSystem = false,
                IsActive = true
            },
            new LeadSource
            {
                Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
                Name = "Social Media",
                Code = "social_media",
                IsSystem = false,
                IsActive = true
            },
            new LeadSource
            {
                Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                Name = "Phone Call",
                Code = "phone_call",
                IsSystem = false,
                IsActive = true
            },
            new LeadSource
            {
                Id = Guid.Parse("77777777-7777-7777-7777-777777777777"),
                Name = "Email",
                Code = "email",
                IsSystem = false,
                IsActive = true
            }
        );
    }

    private static void SeedServices(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Service>().HasData(
            new Service
            {
                Id = Guid.Parse("88888888-8888-8888-8888-888888888881"),
                Name = "Hair Transplant",
                Code = "hair_transplant",
                EstimatedCost = 1500m,
                IsActive = true
            },
            new Service
            {
                Id = Guid.Parse("88888888-8888-8888-8888-888888888882"),
                Name = "Plastic Surgery",
                Code = "plastic_surgery",
                EstimatedCost = 2500m,
                IsActive = true
            },
            new Service
            {
                Id = Guid.Parse("88888888-8888-8888-8888-888888888883"),
                Name = "Rhinoplasty",
                Code = "rhinoplasty",
                EstimatedCost = 2000m,
                IsActive = true
            }
        );
    }

    private static void SeedPipelineStages(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PipelineStage>().HasData(
            new PipelineStage
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"),
                Name = "New Lead",
                SortOrder = 1,
                Color = "#64748B",
                RottingThresholdHours = 24,
                IsDefault = true,
                IsWonStage = false,
                IsLostStage = false,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new PipelineStage
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2"),
                Name = "Contacted",
                SortOrder = 2,
                Color = "#0EA5E9",
                RottingThresholdHours = 48,
                IsDefault = false,
                IsWonStage = false,
                IsLostStage = false,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new PipelineStage
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3"),
                Name = "Qualified",
                SortOrder = 3,
                Color = "#6366F1",
                RottingThresholdHours = 120,
                IsDefault = false,
                IsWonStage = false,
                IsLostStage = false,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new PipelineStage
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4"),
                Name = "Proposal Sent",
                SortOrder = 4,
                Color = "#F59E0B",
                RottingThresholdHours = 168,
                IsDefault = false,
                IsWonStage = false,
                IsLostStage = false,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new PipelineStage
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5"),
                Name = "Won",
                SortOrder = 5,
                Color = "#22C55E",
                RottingThresholdHours = 720,
                IsDefault = false,
                IsWonStage = true,
                IsLostStage = false,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new PipelineStage
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6"),
                Name = "Lost",
                SortOrder = 6,
                Color = "#EF4444",
                RottingThresholdHours = 720,
                IsDefault = false,
                IsWonStage = false,
                IsLostStage = true,
                IsActive = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }

    private static void SeedRolePermissions(ModelBuilder modelBuilder)
    {
        var superAdminPermissions = Crm.Domain.Authorization.CrmPermissions.All
            .Select(permission => new RolePermission
            {
                Role = Crm.Domain.Enums.UserRole.SuperAdmin,
                PermissionCode = permission
            });

        var adminPermissions = new[]
        {
            Crm.Domain.Authorization.CrmPermissions.LeadsCreate,
            Crm.Domain.Authorization.CrmPermissions.LeadsEdit,
            Crm.Domain.Authorization.CrmPermissions.LeadsDelete,
            Crm.Domain.Authorization.CrmPermissions.LeadsAssign,
            Crm.Domain.Authorization.CrmPermissions.TasksCreate,
            Crm.Domain.Authorization.CrmPermissions.TasksEdit,
            Crm.Domain.Authorization.CrmPermissions.TasksDelete,
            Crm.Domain.Authorization.CrmPermissions.TasksAssign,
            Crm.Domain.Authorization.CrmPermissions.TasksComplete,
            Crm.Domain.Authorization.CrmPermissions.ReportsView,
            Crm.Domain.Authorization.CrmPermissions.SettingsManage
        }.Select(permission => new RolePermission
        {
            Role = Crm.Domain.Enums.UserRole.Admin,
            PermissionCode = permission
        });

        var salesManagerPermissions = new[]
        {
            Crm.Domain.Authorization.CrmPermissions.LeadsCreate,
            Crm.Domain.Authorization.CrmPermissions.LeadsEdit,
            Crm.Domain.Authorization.CrmPermissions.LeadsAssign,
            Crm.Domain.Authorization.CrmPermissions.TasksCreate,
            Crm.Domain.Authorization.CrmPermissions.TasksEdit,
            Crm.Domain.Authorization.CrmPermissions.TasksAssign,
            Crm.Domain.Authorization.CrmPermissions.TasksComplete,
            Crm.Domain.Authorization.CrmPermissions.ReportsView
        }.Select(permission => new RolePermission
        {
            Role = Crm.Domain.Enums.UserRole.SalesManager,
            PermissionCode = permission
        });

        var agentPermissions = new[]
        {
            Crm.Domain.Authorization.CrmPermissions.LeadsCreate,
            Crm.Domain.Authorization.CrmPermissions.LeadsEdit,
            Crm.Domain.Authorization.CrmPermissions.TasksCreate,
            Crm.Domain.Authorization.CrmPermissions.TasksEdit,
            Crm.Domain.Authorization.CrmPermissions.TasksComplete
        }.Select(permission => new RolePermission
        {
            Role = Crm.Domain.Enums.UserRole.Agent,
            PermissionCode = permission
        });

        modelBuilder.Entity<RolePermission>().HasData(
            superAdminPermissions
                .Concat(adminPermissions)
                .Concat(salesManagerPermissions)
                .Concat(agentPermissions));
    }

    private void ApplyAuditInformation()
    {
        var utcNow = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAtUtc = utcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = utcNow;
            }
        }

        foreach (var entry in ChangeTracker.Entries<SoftDeleteEntity>()
                     .Where(x => x.State == EntityState.Deleted))
        {
            entry.State = EntityState.Modified;
            entry.Entity.DeletedAtUtc = utcNow;
            entry.Entity.UpdatedAtUtc = utcNow;
        }
    }

    private static void ApplySoftDeleteQueryFilters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(SoftDeleteEntity).IsAssignableFrom(entityType.ClrType))
            {
                continue;
            }

            var parameter = Expression.Parameter(entityType.ClrType, "entity");
            var deletedAtProperty = Expression.Property(parameter, nameof(SoftDeleteEntity.DeletedAtUtc));
            var body = Expression.Equal(
                deletedAtProperty,
                Expression.Constant(null, typeof(DateTime?)));

            var lambda = Expression.Lambda(body, parameter);

            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
        }
    }
}

/*
Why DbContext is critical

Because it controls:

all database access
schema generation
migrations
relationships
queries
saving data

It is essentially:

the heart of the data layer.
*/
