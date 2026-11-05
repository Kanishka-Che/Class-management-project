using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveClassMonthlyFeeSelfReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClassMonthlyFees_ClassMonthlyFees_ClassMonthlyFeeId",
                table: "ClassMonthlyFees");

            migrationBuilder.DropIndex(
                name: "IX_ClassMonthlyFees_ClassMonthlyFeeId",
                table: "ClassMonthlyFees");

            migrationBuilder.DropColumn(
                name: "ClassMonthlyFeeId",
                table: "ClassMonthlyFees");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ClassMonthlyFeeId",
                table: "ClassMonthlyFees",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClassMonthlyFees_ClassMonthlyFeeId",
                table: "ClassMonthlyFees",
                column: "ClassMonthlyFeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_ClassMonthlyFees_ClassMonthlyFees_ClassMonthlyFeeId",
                table: "ClassMonthlyFees",
                column: "ClassMonthlyFeeId",
                principalTable: "ClassMonthlyFees",
                principalColumn: "Id");
        }
    }
}
