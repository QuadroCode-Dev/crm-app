using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Crm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AlignTask123AuthAndAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PasswordHash",
                table: "Users",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefreshTokenExpiresAtUtc",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefreshTokenHash",
                table: "Users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefreshTokenRevokedAtUtc",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "Users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "TaskItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "TaskItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "TaskItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "PipelineStages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "PipelineStages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "PipelineStages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Notes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "Notes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "Notes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Leads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "Leads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "Leads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Contacts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "Contacts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "Contacts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "AutomationRules",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "AutomationRules",
                type: "uuid",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "PipelineStages",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "PipelineStages",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "PipelineStages",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "PipelineStages",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "PipelineStages",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "PipelineStages",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RefreshTokenExpiresAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RefreshTokenHash",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RefreshTokenRevokedAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "PipelineStages");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "PipelineStages");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "PipelineStages");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Contacts");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Contacts");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Contacts");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "AutomationRules");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "AutomationRules");

            migrationBuilder.AlterColumn<string>(
                name: "PasswordHash",
                table: "Users",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);
        }
    }
}
