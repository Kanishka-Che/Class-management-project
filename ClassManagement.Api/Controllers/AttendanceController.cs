using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ClassManagement.Api.Helpers;
using ClassManagement.Api.DTOs;
using System.Security.Claims;

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

        private async Task<bool> CanAccessClass(int classId)
{
    var role = User.FindFirst(ClaimTypes.Role)?.Value;

    if (role == "Admin")
    {
        return true;
    }

    var userIdClaim =
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (!int.TryParse(userIdClaim, out var userId))
    {
        return false;
    }

    return await _context.UserClasses
        .AnyAsync(uc =>
            uc.UserId == userId &&
            uc.ClassId == classId);
}

        // =========================================
        // POST: api/attendance
        // Mark attendance manually
        // =========================================
[HttpPost]
public async Task<IActionResult> MarkAttendance(
    CreateAttendanceRequest request)
{
    if (!await CanAccessClass(request.ClassId))
{
    return StatusCode(
        StatusCodes.Status403Forbidden,
        "You do not have access to this class."
    );
}

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
    CheckInTime = DateTime.UtcNow,
    SessionType = request.SessionType
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
    CheckInTime = attendance.CheckInTime,

     SessionType = attendance.SessionType
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

    if (!await CanAccessClass(request.ClassId))
{
    return StatusCode(
        StatusCodes.Status403Forbidden,
        "You do not have access to this class."
    );
}

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

    // // Student must be enrolled in this class
    // var enrollment = await _context.Enrollments
    //     .Where(e =>
    //         e.StudentId == student.Id &&
    //         e.ClassId == request.ClassId &&
    //         e.IsActive)
    //     .OrderByDescending(e => e.AcademicYear)
    //     .FirstOrDefaultAsync();

    // if (enrollment == null)
    // {
    //     return BadRequest(
    //         "Student is not enrolled in this class."
    //     );
    // }

    // var sriLankaNow = SriLankaTime.Now();
    // var today = DateOnly.FromDateTime(sriLankaNow);


    var sriLankaNow = SriLankaTime.Now();
    var today = DateOnly.FromDateTime(sriLankaNow);
    var currentYear = sriLankaNow.Year; 

    // Student must be enrolled in this class for the current academic year
    var enrollment = await _context.Enrollments
        .FirstOrDefaultAsync(e =>
            e.StudentId == student.Id &&
            e.ClassId == request.ClassId &&
            e.AcademicYear == currentYear && 
            e.IsActive);

    if (enrollment == null)
    {
        return BadRequest(
            $"Student is not enrolled in this class for the academic year {currentYear}."
        );
    }

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
    // Current month payment status
var currentMonthPayment = paymentsSinceJoining
    .FirstOrDefault(p =>
        p.Year == sriLankaNow.Year &&
        p.Month == sriLankaNow.Month);

// Paid months since student joined this class
var paidMonths = paymentsSinceJoining
    .Where(p =>
        p.Year > joinedFeeMonth.Year ||
        (p.Year == joinedFeeMonth.Year &&
         p.Month >= joinedFeeMonth.Month))
    .Where(p =>
        p.Year < currentFeeMonth.Year ||
        (p.Year == currentFeeMonth.Year &&
         p.Month <= currentFeeMonth.Month))
    .Select(p => new DateOnly(p.Year, p.Month, 1))
    .Distinct()
    .OrderBy(m => m)
    .Select(m => m.ToString("yyyy-MM"))
    .ToList();

// Previous unpaid months
var previousUnpaidMonths = new List<string>();

var checkMonth = joinedFeeMonth;

while (checkMonth < currentFeeMonth)
{
    var hasPaid = paymentsSinceJoining.Any(p =>
        p.Year == checkMonth.Year &&
        p.Month == checkMonth.Month);

    if (!hasPaid)
    {
        previousUnpaidMonths.Add(
            checkMonth.ToString("yyyy-MM")
        );
    }

    checkMonth = checkMonth.AddMonths(1);
}
    if (attendance == null)
{
    attendance = new Attendance
    {
        StudentId = student.Id,
        ClassId = request.ClassId,
        AttendanceDate = today,
        CheckInTime = DateTime.UtcNow,
        SessionType = request.SessionType
    };

    _context.Attendances.Add(attendance);
    await _context.SaveChangesAsync();
}

    var monthStart = new DateOnly(
    sriLankaNow.Year,
    sriLankaNow.Month,
    1
);

var nextMonthStart = monthStart.AddMonths(1);

// Regular + Extra attendance count
var daysAttendedThisMonth = await _context.Attendances
    .CountAsync(a =>
        a.StudentId == student.Id &&
        a.ClassId == request.ClassId &&
        a.AttendanceDate >= monthStart &&
        a.AttendanceDate < nextMonthStart
    );

// Regular attendance count only
var regularDaysAttendedThisMonth = await _context.Attendances
    .CountAsync(a =>
        a.StudentId == student.Id &&
        a.ClassId == request.ClassId &&
        a.SessionType == "Regular" &&
        a.AttendanceDate >= monthStart &&
        a.AttendanceDate < nextMonthStart
    );

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
            CheckInTime = attendance.CheckInTime,
            SessionType = attendance.SessionType 
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
    Year = sriLankaNow.Year,
    Month = sriLankaNow.Month,

    IsPaid = currentMonthPayment != null,

    AmountPaid = currentMonthPayment?.Amount ?? 0,

    MonthlyFee = classItem.MonthlyFee,

    PaidAt = currentMonthPayment?.PaidAt,

    UnpaidMonths = previousUnpaidMonths,
PaidMonths = paidMonths
},

        attendanceSummary = new
{
    joinedDate = enrollment.JoinedDate.ToString("yyyy-MM-dd"),
    daysAttendedThisMonth = daysAttendedThisMonth,
    regularDaysAttendedThisMonth = regularDaysAttendedThisMonth
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


if (!await CanAccessClass(classId))
{
    return StatusCode(
        StatusCodes.Status403Forbidden,
        "You do not have access to this class."
    );
}

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
CheckInTime = a.CheckInTime,
SessionType = a.SessionType
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
    var student = await _context.Students
        .FindAsync(studentId);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    var role = User.FindFirst(ClaimTypes.Role)?.Value;

    // =========================================
    // ADMIN -> Full attendance history
    // =========================================
    if (role == "Admin")
    {
        var adminAttendances = await _context.Attendances
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
                CheckInTime = a.CheckInTime,
                SessionType = a.SessionType
            })
            .ToListAsync();

        return Ok(adminAttendances);
    }

    // =========================================
    // STAFF
    // =========================================
    var userIdClaim =
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (!int.TryParse(userIdClaim, out var userId))
    {
        return Unauthorized("Invalid user.");
    }

    // Student must belong to at least one
    // class assigned to this Staff user.
    var hasStudentAccess = await _context.Enrollments
        .AnyAsync(e =>
            e.StudentId == studentId &&
            e.IsActive &&
            _context.UserClasses.Any(uc =>
                uc.UserId == userId &&
                uc.ClassId == e.ClassId
            )
        );

    if (!hasStudentAccess)
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to this student."
        );
    }

    // Return attendance only from classes
    // assigned to this Staff user.
    var staffAttendances = await _context.Attendances
        .Where(a =>
            a.StudentId == studentId &&
            _context.UserClasses.Any(uc =>
                uc.UserId == userId &&
                uc.ClassId == a.ClassId
            )
        )
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
            CheckInTime = a.CheckInTime,
            SessionType = a.SessionType
        })
        .ToListAsync();

    return Ok(staffAttendances);
}
    }
}