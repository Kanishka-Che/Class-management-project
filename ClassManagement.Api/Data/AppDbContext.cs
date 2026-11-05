
using ClassManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(
            DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<ClassDailyRevenueShare> ClassDailyRevenueShares
    => Set<ClassDailyRevenueShare>();

        // =========================================
        // DbSets
        // =========================================

        public DbSet<Student> Students { get; set; }

        public DbSet<ClassManagement.Api.Models.Class> Classes
        {
            get;
            set;
        }

        public DbSet<Enrollment> Enrollments { get; set; }

        public DbSet<Attendance> Attendances { get; set; }

        public DbSet<Payment> Payments { get; set; }

        public DbSet<ClassMonthlyFee> ClassMonthlyFees { get; set; }

        public DbSet<User> Users { get; set; }

        public DbSet<UserClass> UserClasses { get; set; }

        // =========================================
        // Model Configuration
        // =========================================

        protected override void OnModelCreating(
            ModelBuilder modelBuilder)
        {

            
modelBuilder.Entity<Attendance>()
    .Property(a => a.SessionType)
    .HasMaxLength(10)
    .HasDefaultValue("Regular")
    .IsRequired();


            modelBuilder.Entity<ClassDailyRevenueShare>()
    .HasIndex(x => new { x.ClassId, x.Date })
    .IsUnique();

modelBuilder.Entity<ClassDailyRevenueShare>()
    .Property(x => x.ClassPercentage)
    .HasPrecision(5, 2);

modelBuilder.Entity<ClassDailyRevenueShare>()
    .Property(x => x.TeacherPercentage)
    .HasPrecision(5, 2);

            base.OnModelCreating(modelBuilder);

            // Student
            modelBuilder.Entity<Student>()
                .HasIndex(s => s.StudentCode)
                .IsUnique();

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.QrToken)
                .IsUnique();

            // Enrollment
            modelBuilder.Entity<Enrollment>()
                .HasIndex(e => new
                {
                    e.StudentId,
                    e.AcademicYear
                })
                .IsUnique();

            // Attendance
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new
                {
                    a.StudentId,
                    a.ClassId,
                    a.AttendanceDate
                })
                .IsUnique();

            // =====================================
            // Historical Monthly Class Fees
            // =====================================

            modelBuilder.Entity<ClassMonthlyFee>()
                .HasIndex(f => new
                {
                    f.ClassId,
                    f.EffectiveYear,
                    f.EffectiveMonth
                })
                .IsUnique();

                // Explicitly configure the ClassMonthlyFee entity
modelBuilder.Entity<ClassMonthlyFee>()
    .HasKey(f => f.Id);

            modelBuilder.Entity<ClassMonthlyFee>()
                .HasOne(f => f.Class)
                .WithMany(c => c.MonthlyFeeHistory)
                .HasForeignKey(f => f.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ClassMonthlyFee>()
                .Property(f => f.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ClassMonthlyFee>()
                .ToTable(t =>
                {
                    t.HasCheckConstraint(
                        "CK_ClassMonthlyFees_EffectiveMonth",
                        "\"EffectiveMonth\" BETWEEN 1 AND 12"
                    );

                    t.HasCheckConstraint(
                        "CK_ClassMonthlyFees_Amount",
                        "\"Amount\" >= 0"
                    );
                });

            // Payment
            modelBuilder.Entity<Payment>()
                .HasIndex(p => new
                {
                    p.StudentId,
                    p.ClassId,
                    p.Year,
                    p.Month
                })
                .IsUnique();

            // User
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // UserClass -> User
            modelBuilder.Entity<UserClass>()
                .HasOne(uc => uc.User)
                .WithMany(u => u.UserClasses)
                .HasForeignKey(uc => uc.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // UserClass -> Class
            modelBuilder.Entity<UserClass>()
                .HasOne(uc => uc.Class)
                .WithMany(c => c.UserClasses)
                .HasForeignKey(uc => uc.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            // Prevent duplicate class assignment
            modelBuilder.Entity<UserClass>()
                .HasIndex(uc => new
                {
                    uc.UserId,
                    uc.ClassId
                })
                .IsUnique();

                // Remove unintended self-referencing relationship
modelBuilder.Entity<ClassMonthlyFee>()
    .Ignore("MonthlyFeeHistory");
        }
    }
}
