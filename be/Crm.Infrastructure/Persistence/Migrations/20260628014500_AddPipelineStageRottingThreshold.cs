using Crm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Crm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(CrmDbContext))]
    [Migration("20260628014500_AddPipelineStageRottingThreshold")]
    public partial class AddPipelineStageRottingThreshold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RottingThresholdHours",
                table: "PipelineStages",
                type: "integer",
                nullable: false,
                defaultValue: 168);

            migrationBuilder.Sql("""
                UPDATE "PipelineStages"
                SET "RottingThresholdHours" = CASE "Id"
                    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 24
                    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 48
                    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 120
                    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4' THEN 168
                    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5' THEN 720
                    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6' THEN 720
                    ELSE "RottingThresholdHours"
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RottingThresholdHours",
                table: "PipelineStages");
        }
    }
}
