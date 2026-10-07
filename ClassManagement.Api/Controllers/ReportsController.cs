using ClassManagement.Api.Data;
using ClassManagement.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // GET:
        // api/reports/attendance/daily
        // Daily attendance report
        // =========================================
        [HttpGet("attendance/daily")]
        public async Task<IActionResult> GetDailyAttendanceReport(
            [FromQuery] DateOnly date)
        {
            var attendances = await _context.Attendances
                .Where(a => a.AttendanceDate == date)
                .OrderBy(a => a.Class!.Name)
                .ThenBy(a => a.Student!.StudentCode)
                .Select(a => new AttendanceResponse
                {
                    Id = a.Id,

                    StudentId = a.StudentId,
                    StudentCode = a.Student!.StudentCode,
                    StudentName =
                        (a.Student.FirstName + " " +
                         (a.Student.LastName ?? "")).Trim(),

                    ClassId = a.ClassId,
                    ClassName = a.Class!.Name,

                    AttendanceDate = a.AttendanceDate,
                    CheckInTime = a.CheckInTime
                })
                .ToListAsync();

            return Ok(new
            {
                date,
                totalAttendance = attendances.Count,
                attendances
            });
        }

        // =========================================
        // GET:
        // api/reports/attendance/monthly
        // Monthly attendance report
        // =========================================
        [HttpGet("attendance/monthly")]
        public async Task<IActionResult> GetMonthlyAttendanceReport(
            [FromQuery] int year,
            [FromQuery] int month)
        {
            if (month < 1 || month > 12)
            {
                return BadRequest(
                    "Month must be between 1 and 12."
                );
            }

            if (year < 2000 || year > 2100)
            {
                return BadRequest("Invalid year.");
            }

            var startDate = new DateOnly(year, month, 1);
            var endDate = startDate.AddMonths(1);

            var attendances = await _context.Attendances
                .Where(a =>
                    a.AttendanceDate >= startDate &&
                    a.AttendanceDate < endDate)
                .OrderBy(a => a.AttendanceDate)
                .ThenBy(a => a.Class!.Name)
                .ThenBy(a => a.Student!.StudentCode)
                .Select(a => new AttendanceResponse
                {
                    Id = a.Id,

                    StudentId = a.StudentId,
                    StudentCode = a.Student!.StudentCode,
                    StudentName =
                        (a.Student.FirstName + " " +
                         (a.Student.LastName ?? "")).Trim(),

                    ClassId = a.ClassId,
                    ClassName = a.Class!.Name,

                    AttendanceDate = a.AttendanceDate,
                    CheckInTime = a.CheckInTime
                })
                .ToListAsync();

            return Ok(new
            {
                year,
                month,
                totalAttendance = attendances.Count,
                attendances
            });
        }


        // =========================================
// GET:
// api/reports/payments/monthly
// Monthly payment report
// =========================================
[HttpGet("payments/monthly")]
public async Task<IActionResult> GetMonthlyPaymentReport(
    [FromQuery] int year,
    [FromQuery] int month)
{
    if (month < 1 || month > 12)
    {
        return BadRequest(
            "Month must be between 1 and 12."
        );
    }

    if (year < 2000 || year > 2100)
    {
        return BadRequest("Invalid year.");
    }

    var payments = await _context.Payments
        .Where(p =>
            p.Year == year &&
            p.Month == month)
        .OrderBy(p => p.Class!.Name)
        .ThenBy(p => p.Student!.StudentCode)
        .Select(p => new PaymentResponse
        {
            Id = p.Id,

            StudentId = p.StudentId,
            StudentCode = p.Student!.StudentCode,
            StudentName =
                (p.Student.FirstName + " " +
                 (p.Student.LastName ?? "")).Trim(),

            ClassId = p.ClassId,
            ClassName = p.Class!.Name,

            Year = p.Year,
            Month = p.Month,
            Amount = p.Amount,
            PaidAt = p.PaidAt
        })
        .ToListAsync();

    var totalCollected = payments.Sum(p => p.Amount);

    return Ok(new
    {
        year,
        month,
        totalPayments = payments.Count,
        totalCollected,
        payments
    });
}

// =========================================
// GET:
// api/reports/student/{studentId}
// Student full report
// =========================================
[HttpGet("student/{studentId}")]
public async Task<IActionResult> GetStudentReport(int studentId)
{
    var student = await _context.Students
        .FirstOrDefaultAsync(s => s.Id == studentId);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    var attendances = await _context.Attendances
        .Where(a => a.StudentId == studentId)
        .OrderByDescending(a => a.AttendanceDate)
        .Select(a => new AttendanceResponse
        {
            Id = a.Id,
            StudentId = a.StudentId,
            StudentCode = student.StudentCode,
            StudentName =
                (student.FirstName + " " +
                 (student.LastName ?? "")).Trim(),

            ClassId = a.ClassId,
            ClassName = a.Class!.Name,

            AttendanceDate = a.AttendanceDate,
            CheckInTime = a.CheckInTime
        })
        .ToListAsync();

    var payments = await _context.Payments
        .Where(p => p.StudentId == studentId)
        .OrderByDescending(p => p.Year)
        .ThenByDescending(p => p.Month)
        .Select(p => new PaymentResponse
        {
            Id = p.Id,
            StudentId = p.StudentId,
            StudentCode = student.StudentCode,
            StudentName =
                (student.FirstName + " " +
                 (student.LastName ?? "")).Trim(),

            ClassId = p.ClassId,
            ClassName = p.Class!.Name,

            Year = p.Year,
            Month = p.Month,
            Amount = p.Amount,
            PaidAt = p.PaidAt
        })
        .ToListAsync();

    return Ok(new
    {
        student = new
        {
            student.Id,
            student.StudentCode,
            student.FirstName,
            student.LastName,
            student.Phone,
            student.ParentName,
            student.ParentPhone,
            student.School,
            student.IsActive
        },

        totalAttendance = attendances.Count,
        attendances,

        totalPayments = payments.Count,
        totalPaid = payments.Sum(p => p.Amount),
        payments
    });
}

// =========================================
// GET:
// api/reports/class/{classId}/year/{year}
// Class summary report
// =========================================
[HttpGet("class/{classId}/year/{year}")]
public async Task<IActionResult> GetClassSummaryReport(
    int classId,
    int year)
{
    if (year < 2000 || year > 2100)
    {
        return BadRequest("Invalid year.");
    }

    var classItem = await _context.Classes
        .FirstOrDefaultAsync(c => c.Id == classId);

    if (classItem == null)
    {
        return NotFound("Class not found.");
    }

    var totalStudents = await _context.Enrollments
        .CountAsync(e =>
            e.ClassId == classId &&
            e.AcademicYear == year &&
            e.IsActive &&
            e.Student != null &&
            e.Student.IsActive);

    var totalAttendance = await _context.Attendances
        .CountAsync(a =>
            a.ClassId == classId &&
            a.AttendanceDate.Year == year);

    var payments = await _context.Payments
        .Where(p =>
            p.ClassId == classId &&
            p.Year == year)
        .ToListAsync();

    var totalPayments = payments.Count;
    var totalCollected = payments.Sum(p => p.Amount);

    return Ok(new
    {
        classId = classItem.Id,
        className = classItem.Name,
        subject = classItem.Subject,
        teacherName = classItem.TeacherName,
        monthlyFee = classItem.MonthlyFee,
        year,

        totalStudents,
        totalAttendance,
        totalPayments,
        totalCollected
    });
}
    }
}