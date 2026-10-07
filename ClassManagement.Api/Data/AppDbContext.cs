using ClassManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Student> Students { get; set; }

public DbSet<ClassManagement.Api.Models.Class> Classes { get; set; }
public DbSet<Enrollment> Enrollments { get; set; }
public DbSet<Attendance> Attendances { get; set; }
public DbSet<Payment> Payments { get; set; }
public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.StudentCode)
                .IsUnique();

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.QrToken)
                .IsUnique();

                modelBuilder.Entity<Enrollment>()
    .HasIndex(e => new { e.StudentId, e.AcademicYear })
    .IsUnique();


    modelBuilder.Entity<Attendance>()
    .HasIndex(a => new
    {
        a.StudentId,
        a.ClassId,
        a.AttendanceDate
    })
    .IsUnique();


    modelBuilder.Entity<Payment>()
    .HasIndex(p => new
    {
        p.StudentId,
        p.ClassId,
        p.Year,
        p.Month
    })
    .IsUnique();

    modelBuilder.Entity<User>()
    .HasIndex(u => u.Username)
    .IsUnique();
        }
    }
}