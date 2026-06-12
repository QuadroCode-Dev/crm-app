using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Crm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadSourceApiAndSeedDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "LeadSources",
                columns: new[] { "Id", "Code", "IsActive", "IsSystem", "Name" },
                values: new object[,]
                {
                    { new Guid("33333333-3333-3333-3333-333333333333"), "website", true, false, "Website" },
                    { new Guid("44444444-4444-4444-4444-444444444444"), "referral", true, false, "Referral" },
                    { new Guid("55555555-5555-5555-5555-555555555555"), "social_media", true, false, "Social Media" },
                    { new Guid("66666666-6666-6666-6666-666666666666"), "phone_call", true, false, "Phone Call" },
                    { new Guid("77777777-7777-7777-7777-777777777777"), "email", true, false, "Email" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "LeadSources",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "LeadSources",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "LeadSources",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DeleteData(
                table: "LeadSources",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"));

            migrationBuilder.DeleteData(
                table: "LeadSources",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"));
        }
    }
}
