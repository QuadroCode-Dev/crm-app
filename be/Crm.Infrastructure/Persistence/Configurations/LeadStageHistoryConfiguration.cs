using Crm.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Infrastructure.Persistence.Configurations;

public class LeadStageHistoryConfiguration : IEntityTypeConfiguration<LeadStageHistory>
{
    public void Configure(EntityTypeBuilder<LeadStageHistory> builder)
    {
        builder.ToTable("LeadStageHistories");

        builder.HasKey(x => x.Id);

        builder.HasQueryFilter(x => x.Lead != null && x.Lead.DeletedAtUtc == null);

        builder.HasOne(x => x.Lead)
            .WithMany(x => x.StageHistories)
            .HasForeignKey(x => x.LeadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.PipelineStage)
            .WithMany(x => x.StageHistories)
            .HasForeignKey(x => x.PipelineStageId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
