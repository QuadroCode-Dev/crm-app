using System;
using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Crm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(CrmDbContext))]
    [Migration("20260627171000_AddServiceEstimatedCost")]
    public partial class AddServiceEstimatedCost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedCost",
                table: "Services",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Services"
                SET "EstimatedCost" = CASE "Id"
                    WHEN '88888888-8888-8888-8888-888888888881' THEN 1500
                    WHEN '88888888-8888-8888-8888-888888888882' THEN 2500
                    WHEN '88888888-8888-8888-8888-888888888883' THEN 2000
                    ELSE "EstimatedCost"
                END
                WHERE "Id" IN (
                    '88888888-8888-8888-8888-888888888881',
                    '88888888-8888-8888-8888-888888888882',
                    '88888888-8888-8888-8888-888888888883'
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedCost",
                table: "Services");
        }
    }
}
