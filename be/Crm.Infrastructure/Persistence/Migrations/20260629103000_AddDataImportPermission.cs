using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Crm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDataImportPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "PermissionCode", "Role" },
                values: new object[,]
                {
                    { "settings.data_import.manage", 0 },
                    { "settings.data_import.manage", 1 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.data_import.manage", 0 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionCode", "Role" },
                keyValues: new object[] { "settings.data_import.manage", 1 });
        }
    }
}
