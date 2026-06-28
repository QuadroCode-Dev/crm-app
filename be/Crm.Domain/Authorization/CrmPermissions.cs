namespace Crm.Domain.Authorization;

public static class CrmPermissions
{
    public const string UsersManage = "users.manage";
    public const string RolesManage = "roles.manage";
    public const string LeadsCreate = "leads.create";
    public const string LeadsEdit = "leads.edit";
    public const string LeadsDelete = "leads.delete";
    public const string LeadsAssign = "leads.assign";
    public const string TasksCreate = "tasks.create";
    public const string TasksEdit = "tasks.edit";
    public const string TasksDelete = "tasks.delete";
    public const string TasksAssign = "tasks.assign";
    public const string TasksComplete = "tasks.complete";
    public const string ReportsView = "reports.view";
    public const string SettingsManage = "settings.manage";

    public static readonly IReadOnlyList<string> All = new[]
    {
        UsersManage,
        RolesManage,
        LeadsCreate,
        LeadsEdit,
        LeadsDelete,
        LeadsAssign,
        TasksCreate,
        TasksEdit,
        TasksDelete,
        TasksAssign,
        TasksComplete,
        ReportsView,
        SettingsManage
    };
}
