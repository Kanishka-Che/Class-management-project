using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ClassManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClassMonthlyFeeHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClassMonthlyFees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ClassId = table.Column<int>(type: "integer", nullable: false),
                    EffectiveYear = table.Column<int>(type: "integer", nullable: false),
                    EffectiveMonth = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClassMonthlyFeeId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassMonthlyFees", x => x.Id);
                    table.CheckConstraint("CK_ClassMonthlyFees_Amount", "\"Amount\" >= 0");
                    table.CheckConstraint("CK_ClassMonthlyFees_EffectiveMonth", "\"EffectiveMonth\" BETWEEN 1 AND 12");
                    table.ForeignKey(
                        name: "FK_ClassMonthlyFees_ClassMonthlyFees_ClassMonthlyFeeId",
                        column: x => x.ClassMonthlyFeeId,
                        principalTable: "ClassMonthlyFees",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClassMonthlyFees_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassMonthlyFees_ClassId_EffectiveYear_EffectiveMonth",
                table: "ClassMonthlyFees",
                columns: new[] { "ClassId", "EffectiveYear", "EffectiveMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClassMonthlyFees_ClassMonthlyFeeId",
                table: "ClassMonthlyFees",
                column: "ClassMonthlyFeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassMonthlyFees");
        }
    }
}
