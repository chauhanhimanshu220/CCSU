using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CCSUMeerut.Recruitment.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialSqlServer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "applicants",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    login_id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    session_token = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    personal_details = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    recruitment_details = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    education_details = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    documents = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    payment_status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    payment_details = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    application_status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    current_step = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    created_at = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    updated_at = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    submitted_at = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_applicants", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_applicants_LoginId",
                table: "applicants",
                column: "login_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "applicants");
        }
    }
}
