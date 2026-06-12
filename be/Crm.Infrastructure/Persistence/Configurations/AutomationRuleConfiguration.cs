using Crm.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Infrastructure.Persistence.Configurations;

public class AutomationRuleConfiguration : IEntityTypeConfiguration<AutomationRule>
{
    public void Configure(EntityTypeBuilder<AutomationRule> builder)
    {
        builder.ToTable("AutomationRules");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.TaskTitleTemplate)
            .IsRequired()
            .HasMaxLength(300);

        builder.HasOne(x => x.TargetStage)
            .WithMany(x => x.AutomationRules)
            .HasForeignKey(x => x.TargetStageId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}