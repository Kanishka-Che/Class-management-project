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

        public DbSet<User> Users { get; set; }

        public DbSet<UserClass> UserClasses { get; set; }

        // =========================================
        // Model Configuration
        // =========================================

        protected override void OnModelCreating(
            ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // =====================================
            // Student
            // =====================================

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.StudentCode)
                .IsUnique();

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.QrToken)
                .IsUnique();

            // =====================================
            // Enrollment
            // =====================================

            modelBuilder.Entity<Enrollment>()
                .HasIndex(e => new
                {
                    e.StudentId,
                    e.AcademicYear
                })
                .IsUnique();

            // =====================================
            // Attendance
            // =====================================

            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new
                {
                    a.StudentId,
                    a.ClassId,
                    a.AttendanceDate
                })
                .IsUnique();

            // =====================================
            // Payment
            // =====================================

            modelBuilder.Entity<Payment>()
                .HasIndex(p => new
                {
                    p.StudentId,
                    p.ClassId,
                    p.Year,
                    p.Month
                })
                .IsUnique();

            // =====================================
            // User
            // =====================================

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // =====================================
            // UserClass
            // User -> Classes
            // =====================================

            modelBuilder.Entity<UserClass>()
                .HasOne(uc => uc.User)
                .WithMany(u => u.UserClasses)
                .HasForeignKey(uc => uc.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // =====================================
            // UserClass
            // Class -> Users
            // =====================================

            modelBuilder.Entity<UserClass>()
                .HasOne(uc => uc.Class)
                .WithMany(c => c.UserClasses)
                .HasForeignKey(uc => uc.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            // =====================================
            // Prevent duplicate class assignment
            // =====================================

            modelBuilder.Entity<UserClass>()
                .HasIndex(uc => new
                {
                    uc.UserId,
                    uc.ClassId
                })
                .IsUnique();
        }
    }
}