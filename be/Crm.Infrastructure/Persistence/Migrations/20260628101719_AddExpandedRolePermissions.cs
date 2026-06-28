using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Crm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExpandedRolePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "PermissionCode", "Role" },
                values: new object[,]
                {
                    { "contacts.create", 0 },
                    { "contacts.delete", 0 },
                    { "contacts.edit", 0 },
                    { "leads.change_stage", 0 },
                    { "pipeline.view", 0 },
                    { "settings.automation.manage", 0 },
                    { "settings.integrations.manage", 0 },
                    { "settings.pipeline.manage", 0 },
                    { "settings.services.manage", 0 },
                    { "contacts.create", 1 },
                    { "contacts.delete", 1 },
                    { "contacts.edit", 1 },
                    { "leads.change_stage", 1 },
                    { "pipeline.view", 1 },
                    { "settings.automation.manage", 1 },
                    { "settings.integrations.manage", 1 },
                    { "settings.pipeline.manage", 1 },
                    { "settings.services.manage", 1 },
                    { "contacts.create", 2 },
                    { "contacts.edit", 2 },
                    { "leads.change_stage", 2 },
                    { "pipeline.view", 2 },
                    { "contacts.create", 3 },
                    { "contacts.edit", 3 },
                    { "leads.change_stage", 3 },
                    { "pipeline.view", 3 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.create", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.delete", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.edit", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "leads.change_stage", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "pipeline.view", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.automation.manage", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.integrations.manage", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.pipeline.manage", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.services.manage", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.create", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.delete", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.edit", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "leads.change_stage", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "pipeline.view", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.automation.manage", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.integrations.manage", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.pipeline.manage", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.services.manage", 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.create", 2 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.edit", 2 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "leads.change_stage", 2 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "pipeline.view", 2 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.create", 3 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "contacts.edit", 3 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "leads.change_stage", 3 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "pipeline.view", 3 });
        }
    }
}
