using Crm.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Infrastructure.Persistence.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("Notes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Body)
            .IsRequired();

        builder.HasOne(x => x.Lead)
            .WithMany(x => x.Notes)
            .HasForeignKey(x => x.LeadId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Contact)
            .WithMany(x => x.Notes)
            .HasForeignKey(x => x.ContactId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}