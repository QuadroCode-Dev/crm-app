using Crm.Domain.Common;

namespace Crm.Domain.Entities;

public class PipelineStage : SoftDeleteEntity
{
    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string? Color { get; set; }

    public bool IsDefault { get; set; }

    public bool IsWonStage { get; set; }

    public bool IsLostStage { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Lead> Leads { get; set; } = new List<Lead>();

    public ICollection<LeadStageHistory> StageHistories { get; set; } = new List<LeadStageHistory>();

    public ICollection<AutomationRule> AutomationRules { get; set; } = new List<AutomationRule>();
}
// Represents stages of the sales process.
// Where the lead currently is in the sales pipeline