using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ClassManagement.Api.Helpers;
using ClassManagement.Api.DTOs;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AttendanceController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // POST: api/attendance
        // Mark attendance manually
        // =========================================
[HttpPost]
public async Task<IActionResult> MarkAttendance(
    CreateAttendanceRequest request)
{
    // Check student
    var student = await _context.Students
        .FindAsync(request.StudentId);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    // Student must be active
    if (!student.IsActive)
    {
        return BadRequest("Student is inactive.");
    }

    // Check class
    var classItem = await _context.Classes
        .FindAsync(request.ClassId);

    if (classItem == null)
    {
        return NotFound("Class not found.");
    }

    // Class must be active
    if (!classItem.IsActive)
    {
        return BadRequest("Class is inactive.");
    }

    // Check enrollment
    var enrollment = await _context.Enrollments
        .FirstOrDefaultAsync(e =>
            e.StudentId == request.StudentId &&
            e.ClassId == request.ClassId &&
            e.IsActive);

    if (enrollment == null)
    {
        return BadRequest(
            "Student is not enrolled in this class."
        );
    }

    var today = SriLankaTime.Today();

    // Prevent duplicate attendance
    var existingAttendance = await _context.Attendances
        .FirstOrDefaultAsync(a =>
            a.StudentId == request.StudentId &&
            a.ClassId == request.ClassId &&
            a.AttendanceDate == today);

    if (existingAttendance != null)
    {
        return BadRequest(
            "Attendance already marked for today."
        );
    }

    // Server creates attendance record
    var attendance = new Attendance
    {
        StudentId = request.StudentId,
        ClassId = request.ClassId,
        AttendanceDate = today,
        CheckInTime = DateTime.UtcNow
    };

    _context.Attendances.Add(attendance);
    await _context.SaveChangesAsync();

    return Ok(new AttendanceResponse
{
    Id = attendance.Id,

    StudentId = student.Id,
    StudentCode = student.StudentCode,
    StudentName =
        $"{student.FirstName} {student.LastName}".Trim(),

    ClassId = classItem.Id,
    ClassName = classItem.Name,

    AttendanceDate = attendance.AttendanceDate,
    CheckInTime = attendance.CheckInTime
});
}

// =========================================
// POST: api/attendance/qr
// Mark attendance using QR token
// Return student, class and payment details
// =========================================
[HttpPost("qr")]
public async Task<IActionResult> MarkAttendanceByQr(
    QrAttendanceRequest request)
{
    if (string.IsNullOrWhiteSpace(request.QrToken))
    {
        return BadRequest("QR token is required.");
    }

    // Find active student using QR
    var student = await _context.Students
        .FirstOrDefaultAsync(s =>
            s.QrToken == request.QrToken.Trim() &&
            s.IsActive);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    // Find class
    var classItem = await _context.Classes
        .FindAsync(request.ClassId);

    if (classItem == null)
    {
        return NotFound("Class not found.");
    }

    if (!classItem.IsActive)
    {
        return BadRequest("Class is inactive.");
    }

    // Student must be enrolled in this class
    var enrollment = await _context.Enrollments
        .Where(e =>
            e.StudentId == student.Id &&
            e.ClassId == request.ClassId &&
            e.IsActive)
        .OrderByDescending(e => e.AcademicYear)
        .FirstOrDefaultAsync();

    if (enrollment == null)
    {
        return BadRequest(
            "Student is not enrolled in this class."
        );
    }

    var sriLankaNow = SriLankaTime.Now();
    var today = DateOnly.FromDateTime(sriLankaNow);

    // Prevent duplicate attendance
    var existingAttendance = await _context.Attendances
        .FirstOrDefaultAsync(a =>
            a.StudentId == student.Id &&
            a.ClassId == request.ClassId &&
            a.AttendanceDate == today);

    var currentFeeMonth = new DateOnly(sriLankaNow.Year, sriLankaNow.Month, 1);
    var joinedFeeMonth = new DateOnly(
        enrollment.JoinedDate.Year,
        enrollment.JoinedDate.Month,
        1);
    var paymentsSinceJoining = await _context.Payments
        .Where(p =>
            p.StudentId == student.Id &&
            p.ClassId == request.ClassId &&
            p.Year >= joinedFeeMonth.Year &&
            p.Year <= currentFeeMonth.Year)
        .ToListAsync();

    var feeMonth = joinedFeeMonth;
    while (feeMonth < currentFeeMonth &&
           paymentsSinceJoining.Any(p =>
               p.Year == feeMonth.Year && p.Month == feeMonth.Month))
    {
        feeMonth = feeMonth.AddMonths(1);
    }

    if (feeMonth > currentFeeMonth)
    {
        feeMonth = currentFeeMonth;
    }

    var payment = paymentsSinceJoining.FirstOrDefault(p =>
        p.Year == feeMonth.Year && p.Month == feeMonth.Month);

    var attendance = existingAttendance;
    if (attendance == null)
    {
        attendance = new Attendance
        {
            StudentId = student.Id,
            ClassId = request.ClassId,
            AttendanceDate = today,
            CheckInTime = DateTime.UtcNow
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();
    }

    var monthStart = new DateOnly(sriLankaNow.Year, sriLankaNow.Month, 1);
    var daysAttendedThisMonth = await _context.Attendances
        .CountAsync(a =>
            a.StudentId == student.Id &&
            a.ClassId == request.ClassId &&
            a.AttendanceDate >= monthStart &&
            a.AttendanceDate <= today);

    return Ok(new
    {
        message = existingAttendance == null
            ? "Attendance marked successfully."
            : "Attendance was already marked for today.",

        attendance = new AttendanceResponse
        {
            Id = attendance.Id,

            StudentId = student.Id,
            StudentCode = student.StudentCode,
            StudentName =
                $"{student.FirstName} {student.LastName}".Trim(),

            ClassId = classItem.Id,
            ClassName = classItem.Name,

            AttendanceDate = attendance.AttendanceDate,
            CheckInTime = attendance.CheckInTime
        },

        student = new
        {
            student.Id,
            student.StudentCode,
            student.FirstName,
            student.LastName,
            student.Phone,
            student.ParentName,
            student.ParentPhone,
            student.School
        },

        classDetails = new
        {
            classItem.Id,
            classItem.Name,
            classItem.Subject,
            classItem.TeacherName,
            classItem.MonthlyFee,
            classItem.Day,
            classItem.StartTime
        },

        payment = new
        {
            Year = feeMonth.Year,
            Month = feeMonth.Month,

            IsPaid = payment != null,

            AmountPaid = payment?.Amount ?? 0,

            MonthlyFee = classItem.MonthlyFee,

            PaidAt = payment?.PaidAt
        },

        attendanceSummary = new
            {
                joinedDate = enrollment.JoinedDate.ToString("yyyy-MM-dd"),
                daysAttendedThisMonth = daysAttendedThisMonth
            }
    });
}

        // =========================================
        // GET:
        // api/attendance/class/{classId}/date/{date}
        // Get attendance for class by date
        // =========================================
        [HttpGet("class/{classId}/date/{date}")]
        public async Task<IActionResult> GetAttendanceByClassAndDate(
            int classId,
            DateOnly date)
        {
            var classItem = await _context.Classes.FindAsync(classId);

            if (classItem == null)
            {
                return NotFound("Class not found.");
            }

           var attendances = await _context.Attendances
    .Where(a =>
        a.ClassId == classId &&
        a.AttendanceDate == date)
    .OrderBy(a => a.CheckInTime)
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

            return Ok(attendances);
        }

        // =========================================
        // GET: api/attendance/student/{studentId}
        // Get student's attendance history
        // =========================================
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentAttendanceHistory(
            int studentId)
        {
            var student = await _context.Students.FindAsync(studentId);

            if (student == null)
            {
                return NotFound("Student not found.");
            }

            var attendances = await _context.Attendances
    .Where(a => a.StudentId == studentId)
    .OrderByDescending(a => a.AttendanceDate)
    .ThenByDescending(a => a.CheckInTime)
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

            return Ok(attendances);
        }
    }
}