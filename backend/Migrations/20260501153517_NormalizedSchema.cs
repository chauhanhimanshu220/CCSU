using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CCSUMeerut.Recruitment.Api.Migrations
{
    /// <inheritdoc />
    public partial class NormalizedSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_applicants_LoginId",
                table: "applicants",
                newName: "IX_applicants_login_id");

            migrationBuilder.CreateTable(
                name: "document_records",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    DocumentKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OriginalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StoredName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    Mimetype = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UploadedAt = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_document_records_applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "applicants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "education_records",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    Level = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DegreeName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BoardUniversity = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PassingYear = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MarksObtained = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MaxMarks = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_education_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_education_records_applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "applicants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "experience_records",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    OrganizationName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DepartmentName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Designation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NatureOfEmployment = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DateOfJoining = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DateOfRelieving = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalExperience = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_experience_records_applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "applicants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_records",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PayerName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TransactionId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PaidAt = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payment_records_applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "applicants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "personal_details",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FatherName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MotherName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AadhaarNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DateOfBirth = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MobileNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AlternateMobileNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EmailAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Nationality = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsUpDomicile = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PersonWithDisability = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsEws = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DomicileCertificateNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DomicileState = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrespondenceAddressLine1 = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrespondenceAddressLine2 = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrespondenceCity = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrespondenceState = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrespondenceDistrict = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrespondencePinCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PermanentAddressLine1 = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PermanentAddressLine2 = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PermanentCity = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PermanentState = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PermanentDistrict = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PermanentPinCode = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_personal_details", x => x.Id);
                    table.ForeignKey(
                        name: "FK_personal_details_applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "applicants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "recruitment_details",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    AdvertisementNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PostAppliedFor = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recruitment_details", x => x.Id);
                    table.ForeignKey(
                        name: "FK_recruitment_details_applicants_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "applicants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_document_records_ApplicantId",
                table: "document_records",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_education_records_ApplicantId",
                table: "education_records",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_experience_records_ApplicantId",
                table: "experience_records",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_records_ApplicantId",
                table: "payment_records",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_personal_details_ApplicantId",
                table: "personal_details",
                column: "ApplicantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_recruitment_details_ApplicantId",
                table: "recruitment_details",
                column: "ApplicantId",
                unique: true);

            // --- DATA MIGRATION ---
            
            // Personal Details
            migrationBuilder.Sql(@"
                INSERT INTO personal_details (ApplicantId, Name, FatherName, MotherName, AadhaarNumber, DateOfBirth, MobileNumber, AlternateMobileNumber, EmailAddress, Gender, Nationality, Category, IsUpDomicile, PersonWithDisability, IsEws, DomicileCertificateNumber, DomicileState, CorrespondenceAddressLine1, CorrespondenceAddressLine2, CorrespondenceCity, CorrespondenceState, CorrespondenceDistrict, CorrespondencePinCode, PermanentAddressLine1, PermanentAddressLine2, PermanentCity, PermanentState, PermanentDistrict, PermanentPinCode)
                SELECT 
                    id, 
                    ISNULL(JSON_VALUE(personal_details, '$.Name'), ''), ISNULL(JSON_VALUE(personal_details, '$.FatherName'), ''), ISNULL(JSON_VALUE(personal_details, '$.MotherName'), ''), ISNULL(JSON_VALUE(personal_details, '$.AadhaarNumber'), ''), ISNULL(JSON_VALUE(personal_details, '$.DateOfBirth'), ''), ISNULL(JSON_VALUE(personal_details, '$.MobileNumber'), ''), ISNULL(JSON_VALUE(personal_details, '$.AlternateMobileNumber'), ''), ISNULL(JSON_VALUE(personal_details, '$.EmailAddress'), ''), ISNULL(JSON_VALUE(personal_details, '$.Gender'), ''), ISNULL(JSON_VALUE(personal_details, '$.Nationality'), 'Indian'), ISNULL(JSON_VALUE(personal_details, '$.Category'), ''), ISNULL(JSON_VALUE(personal_details, '$.IsUpDomicile'), ''), ISNULL(JSON_VALUE(personal_details, '$.PersonWithDisability'), 'No'), ISNULL(JSON_VALUE(personal_details, '$.IsEws'), 'No'), ISNULL(JSON_VALUE(personal_details, '$.DomicileCertificateNumber'), ''), ISNULL(JSON_VALUE(personal_details, '$.DomicileState'), ''), 
                    ISNULL(JSON_VALUE(personal_details, '$.CorrespondenceAddressLine1'), ''), ISNULL(JSON_VALUE(personal_details, '$.CorrespondenceAddressLine2'), ''), ISNULL(JSON_VALUE(personal_details, '$.CorrespondenceDistrict'), ''), ISNULL(JSON_VALUE(personal_details, '$.CorrespondenceState'), ''), ISNULL(JSON_VALUE(personal_details, '$.CorrespondenceDistrict'), ''), ISNULL(JSON_VALUE(personal_details, '$.CorrespondencePinCode'), ''), 
                    ISNULL(JSON_VALUE(personal_details, '$.PermanentAddressLine1'), ''), ISNULL(JSON_VALUE(personal_details, '$.PermanentAddressLine2'), ''), ISNULL(JSON_VALUE(personal_details, '$.PermanentDistrict'), ''), ISNULL(JSON_VALUE(personal_details, '$.PermanentState'), ''), ISNULL(JSON_VALUE(personal_details, '$.PermanentDistrict'), ''), ISNULL(JSON_VALUE(personal_details, '$.PermanentPinCode'), '')
                FROM applicants");

            // Recruitment Details
            migrationBuilder.Sql(@"
                INSERT INTO recruitment_details (ApplicantId, AdvertisementNumber, PostAppliedFor)
                SELECT id, ISNULL(JSON_VALUE(recruitment_details, '$.AdvertisementNumber'), ''), ISNULL(JSON_VALUE(recruitment_details, '$.PostAppliedFor'), '')
                FROM applicants");

            // Education (HighSchool)
            migrationBuilder.Sql(@"
                INSERT INTO education_records (ApplicantId, Level, BoardUniversity, PassingYear, MarksObtained, MaxMarks, IsEnabled, DegreeName)
                SELECT id, 'HighSchool', ISNULL(JSON_VALUE(education_details, '$.HighSchool.Board'), ''), ISNULL(JSON_VALUE(education_details, '$.HighSchool.PassingYear'), ''), ISNULL(JSON_VALUE(education_details, '$.HighSchool.MarksObtained'), ''), ISNULL(JSON_VALUE(education_details, '$.HighSchool.MaxMarks'), ''), 1, ''
                FROM applicants");

            // Education (Intermediate)
            migrationBuilder.Sql(@"
                INSERT INTO education_records (ApplicantId, Level, BoardUniversity, PassingYear, MarksObtained, MaxMarks, IsEnabled, DegreeName)
                SELECT id, 'Intermediate', ISNULL(JSON_VALUE(education_details, '$.Intermediate.Board'), ''), ISNULL(JSON_VALUE(education_details, '$.Intermediate.PassingYear'), ''), ISNULL(JSON_VALUE(education_details, '$.Intermediate.MarksObtained'), ''), ISNULL(JSON_VALUE(education_details, '$.Intermediate.MaxMarks'), ''), 1, ''
                FROM applicants");

            // Education (Graduation)
            migrationBuilder.Sql(@"
                INSERT INTO education_records (ApplicantId, Level, BoardUniversity, PassingYear, MarksObtained, MaxMarks, IsEnabled, DegreeName)
                SELECT id, 'Graduation', ISNULL(JSON_VALUE(education_details, '$.Graduation.University'), ''), ISNULL(JSON_VALUE(education_details, '$.Graduation.PassingYear'), ''), ISNULL(JSON_VALUE(education_details, '$.Graduation.MarksObtained'), ''), ISNULL(JSON_VALUE(education_details, '$.Graduation.MaxMarks'), ''), ISNULL(CAST(JSON_VALUE(education_details, '$.Graduation.Enabled') AS BIT), 0), ISNULL(JSON_VALUE(education_details, '$.Graduation.Course'), '')
                FROM applicants WHERE JSON_VALUE(education_details, '$.Graduation.Enabled') = 'true'");

            // Education (PostGraduation)
            migrationBuilder.Sql(@"
                INSERT INTO education_records (ApplicantId, Level, BoardUniversity, PassingYear, MarksObtained, MaxMarks, IsEnabled, DegreeName)
                SELECT id, 'PostGraduation', ISNULL(JSON_VALUE(education_details, '$.PostGraduation.University'), ''), ISNULL(JSON_VALUE(education_details, '$.PostGraduation.PassingYear'), ''), ISNULL(JSON_VALUE(education_details, '$.PostGraduation.MarksObtained'), ''), ISNULL(JSON_VALUE(education_details, '$.PostGraduation.MaxMarks'), ''), ISNULL(CAST(JSON_VALUE(education_details, '$.PostGraduation.Enabled') AS BIT), 0), ISNULL(JSON_VALUE(education_details, '$.PostGraduation.Course'), '')
                FROM applicants WHERE JSON_VALUE(education_details, '$.PostGraduation.Enabled') = 'true'");

            // Experiences
            migrationBuilder.Sql(@"
                INSERT INTO experience_records (ApplicantId, OrganizationName, DepartmentName, Designation, NatureOfEmployment, DateOfJoining, DateOfRelieving, TotalExperience)
                SELECT 
                    a.id, 
                    ISNULL(JSON_VALUE(exp.value, '$.OrganizationName'), ''), 
                    ISNULL(JSON_VALUE(exp.value, '$.DepartmentName'), ''), 
                    ISNULL(JSON_VALUE(exp.value, '$.Designation'), ''), 
                    ISNULL(JSON_VALUE(exp.value, '$.NatureOfEmployment'), ''), 
                    ISNULL(JSON_VALUE(exp.value, '$.DateOfJoining'), ''), 
                    ISNULL(JSON_VALUE(exp.value, '$.DateOfRelieving'), ''), 
                    ISNULL(JSON_VALUE(exp.value, '$.TotalExperience'), '')
                FROM applicants a
                CROSS APPLY OPENJSON(a.education_details, '$.PreviousServiceDetails.Experiences') AS exp");

            // Payments
            migrationBuilder.Sql(@"
                INSERT INTO payment_records (ApplicantId, Amount, PaymentMethod, PayerName, TransactionId, PaidAt)
                SELECT id, ISNULL(CAST(JSON_VALUE(payment_details, '$.Amount') AS DECIMAL(18,2)), 0), ISNULL(JSON_VALUE(payment_details, '$.PaymentMethod'), ''), ISNULL(JSON_VALUE(payment_details, '$.PayerName'), ''), ISNULL(JSON_VALUE(payment_details, '$.TransactionId'), ''), ISNULL(JSON_VALUE(payment_details, '$.PaidAt'), '')
                FROM applicants WHERE payment_status = 'completed'");

            // --- DROP LEGACY COLUMNS ---
            
            migrationBuilder.DropColumn(
                name: "documents",
                table: "applicants");

            migrationBuilder.DropColumn(
                name: "education_details",
                table: "applicants");

            migrationBuilder.DropColumn(
                name: "payment_details",
                table: "applicants");

            migrationBuilder.DropColumn(
                name: "personal_details",
                table: "applicants");

            migrationBuilder.DropColumn(
                name: "recruitment_details",
                table: "applicants");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "document_records");

            migrationBuilder.DropTable(
                name: "education_records");

            migrationBuilder.DropTable(
                name: "experience_records");

            migrationBuilder.DropTable(
                name: "payment_records");

            migrationBuilder.DropTable(
                name: "personal_details");

            migrationBuilder.DropTable(
                name: "recruitment_details");

            migrationBuilder.RenameIndex(
                name: "IX_applicants_login_id",
                table: "applicants",
                newName: "IX_applicants_LoginId");

            migrationBuilder.AddColumn<string>(
                name: "documents",
                table: "applicants",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "education_details",
                table: "applicants",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "payment_details",
                table: "applicants",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "personal_details",
                table: "applicants",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "recruitment_details",
                table: "applicants",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
