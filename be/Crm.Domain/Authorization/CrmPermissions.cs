namespace Crm.Domain.Authorization;

public static class CrmPermissions
{
    public const string UsersManage = "users.manage";
    public const string RolesManage = "roles.manage";
    public const string ContactsCreate = "contacts.create";
    public const string ContactsEdit = "contacts.edit";
    public const string ContactsDelete = "contacts.delete";
    public const string PipelineView = "pipeline.view";
    public const string LeadsCreate = "leads.create";
    public const string LeadsEdit = "leads.edit";
    public const string LeadsDelete = "leads.delete";
    public const string LeadsAssign = "leads.assign";
    public const string LeadsChangeStage = "leads.change_stage";
    public const string TasksCreate = "tasks.create";
    public const string TasksEdit = "tasks.edit";
    public const string TasksDelete = "tasks.delete";
    public const string TasksAssign = "tasks.assign";
    public const string TasksComplete = "tasks.complete";
    public const string ReportsView = "reports.view";
    public const string SettingsManage = "settings.manage";
    public const string SettingsPipelineManage = "settings.pipeline.manage";
    public const string SettingsServicesManage = "settings.services.manage";
    public const string SettingsAutomationManage = "settings.automation.manage";
    public const string SettingsIntegrationsManage = "settings.integrations.manage";
    public const string SettingsDataImportManage = "settings.data_import.manage";

    public static readonly IReadOnlyList<string> All = new[]
    {
        UsersManage,
        RolesManage,
        ContactsCreate,
        ContactsEdit,
        ContactsDelete,
        PipelineView,
        LeadsCreate,
        LeadsEdit,
        LeadsDelete,
        LeadsAssign,
        LeadsChangeStage,
        TasksCreate,
        TasksEdit,
        TasksDelete,
        TasksAssign,
        TasksComplete,
        ReportsView,
        SettingsManage,
        SettingsPipelineManage,
        SettingsServicesManage,
        SettingsAutomationManage,
        SettingsIntegrationsManage,
        SettingsDataImportManage
    };
}
