namespace Crm.Domain.Common;

public abstract class SoftDeleteEntity : AuditableEntity
{
    public DateTime? DeletedAtUtc { get; set; }
    public Guid? DeletedByUserId { get; set; }
}
