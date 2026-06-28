using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Crm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUsersManagementRolePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Role = table.Column<int>(type: "integer", nullable: false),
                    PermissionCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => new { x.Role, x.PermissionCode });
                });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "PermissionCode", "Role" },
                values: new object[,]
                {
                    { "leads.assign", 0 },
                    { "leads.create", 0 },
                    { "leads.delete", 0 },
                    { "leads.edit", 0 },
                    { "reports.view", 0 },
                    { "roles.manage", 0 },
                    { "settings.manage", 0 },
                    { "tasks.assign", 0 },
                    { "tasks.complete", 0 },
                    { "tasks.create", 0 },
                    { "tasks.delete", 0 },
                    { "tasks.edit", 0 },
                    { "users.manage", 0 },
                    { "leads.assign", 1 },
                    { "leads.create", 1 },
                    { "leads.delete", 1 },
                    { "leads.edit", 1 },
                    { "reports.view", 1 },
                    { "settings.manage", 1 },
                    { "tasks.assign", 1 },
                    { "tasks.complete", 1 },
                    { "tasks.create", 1 },
                    { "tasks.delete", 1 },
                    { "tasks.edit", 1 },
                    { "leads.assign", 2 },
                    { "leads.create", 2 },
                    { "leads.edit", 2 },
                    { "reports.view", 2 },
                    { "tasks.assign", 2 },
                    { "tasks.complete", 2 },
                    { "tasks.create", 2 },
                    { "tasks.edit", 2 },
                    { "leads.create", 3 },
                    { "leads.edit", 3 },
                    { "tasks.complete", 3 },
                    { "tasks.create", 3 },
                    { "tasks.edit", 3 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RolePermissions");
        }
    }
}
