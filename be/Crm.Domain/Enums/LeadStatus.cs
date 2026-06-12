namespace Crm.Domain.Enums;

public enum LeadStatus
{
    Open = 1, // still being followed
    Won = 2, // became a client
    Lost = 3, // deal failed
    Archived = 4 // hidden/inactive
}
