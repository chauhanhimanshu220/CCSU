using CCSUMeerut.Recruitment.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CCSUMeerut.Recruitment.Api.Data;

public class RecruitmentDbContext : DbContext
{
    public RecruitmentDbContext(DbContextOptions<RecruitmentDbContext> options)
        : base(options)
    {
    }

    public DbSet<ApplicantRecord> Applicants => Set<ApplicantRecord>();
    public DbSet<PersonalDetailsRecord> PersonalDetails => Set<PersonalDetailsRecord>();
    public DbSet<RecruitmentDetailsRecord> RecruitmentDetails => Set<RecruitmentDetailsRecord>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<ExperienceRecord> ExperienceRecords => Set<ExperienceRecord>();
    public DbSet<DocumentRecord> DocumentRecords => Set<DocumentRecord>();
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Applicants Configuration
        modelBuilder.Entity<ApplicantRecord>(entity =>
        {
            entity.ToTable("applicants");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.LoginId).HasColumnName("login_id").IsRequired();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(e => e.SessionToken).HasColumnName("session_token");
            entity.Property(e => e.PaymentStatus).HasColumnName("payment_status").IsRequired();
            entity.Property(e => e.ApplicationStatus).HasColumnName("application_status").IsRequired();
            entity.Property(e => e.CurrentStep).HasColumnName("current_step").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();
            entity.Property(e => e.SubmittedAt).HasColumnName("submitted_at");

            entity.HasIndex(e => e.LoginId).IsUnique();
        });

        // PersonalDetails Configuration (1:1)
        modelBuilder.Entity<PersonalDetailsRecord>(entity =>
        {
            entity.ToTable("personal_details");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Applicant)
                  .WithOne(a => a.PersonalDetails)
                  .HasForeignKey<PersonalDetailsRecord>(e => e.ApplicantId);
        });

        // RecruitmentDetails Configuration (1:1)
        modelBuilder.Entity<RecruitmentDetailsRecord>(entity =>
        {
            entity.ToTable("recruitment_details");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Applicant)
                  .WithOne(a => a.RecruitmentDetails)
                  .HasForeignKey<RecruitmentDetailsRecord>(e => e.ApplicantId);
        });

        // EducationRecords Configuration (1:N)
        modelBuilder.Entity<EducationRecord>(entity =>
        {
            entity.ToTable("education_records");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Applicant)
                  .WithMany(a => a.EducationRecords)
                  .HasForeignKey(e => e.ApplicantId);
        });

        // ExperienceRecords Configuration (1:N)
        modelBuilder.Entity<ExperienceRecord>(entity =>
        {
            entity.ToTable("experience_records");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Applicant)
                  .WithMany(a => a.ExperienceRecords)
                  .HasForeignKey(e => e.ApplicantId);
        });

        // DocumentRecords Configuration (1:N)
        modelBuilder.Entity<DocumentRecord>(entity =>
        {
            entity.ToTable("document_records");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Applicant)
                  .WithMany(a => a.DocumentRecords)
                  .HasForeignKey(e => e.ApplicantId);
        });

        // PaymentRecords Configuration (1:N)
        modelBuilder.Entity<PaymentRecord>(entity =>
        {
            entity.ToTable("payment_records");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.HasOne(e => e.Applicant)
                  .WithMany(a => a.PaymentRecords)
                  .HasForeignKey(e => e.ApplicantId);
        });
    }
}
