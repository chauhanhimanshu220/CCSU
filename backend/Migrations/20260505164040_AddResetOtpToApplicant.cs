using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CCSUMeerut.Recruitment.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResetOtpToApplicant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ResetOtp",
                table: "applicants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResetOtpExpiry",
                table: "applicants",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResetOtp",
                table: "applicants");

            migrationBuilder.DropColumn(
                name: "ResetOtpExpiry",
                table: "applicants");
        }
    }
}
