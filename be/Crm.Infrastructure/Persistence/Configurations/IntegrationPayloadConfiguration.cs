using Crm.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Infrastructure.Persistence.Configurations;

public class IntegrationPayloadConfiguration : IEntityTypeConfiguration<IntegrationPayload>
{
    public void Configure(EntityTypeBuilder<IntegrationPayload> builder)
    {
        builder.ToTable("IntegrationPayloads");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Source)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.RawJson)
            .IsRequired();

        builder.HasOne(x => x.CreatedLead)
            .WithMany()
            .HasForeignKey(x => x.CreatedLeadId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}