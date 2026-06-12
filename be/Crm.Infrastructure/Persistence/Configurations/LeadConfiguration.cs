using Crm.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Infrastructure.Persistence.Configurations;

public class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> builder)
    {
        builder.ToTable("Leads");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.ServiceRequested)
            .HasMaxLength(200);

        builder.Property(x => x.EstimatedCost)
            .HasColumnType("decimal(18,2)");

        builder.HasOne(x => x.Contact)
            .WithMany(x => x.Leads)
            .HasForeignKey(x => x.ContactId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.LeadSource)
            .WithMany(x => x.Leads)
            .HasForeignKey(x => x.LeadSourceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CurrentPipelineStage)
            .WithMany(x => x.Leads)
            .HasForeignKey(x => x.CurrentPipelineStageId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.OwnerUser)
            .WithMany()
            .HasForeignKey(x => x.OwnerUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
