
using ClassManagement.Api.Data;
using ClassManagement.Api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetDashboardSummary(
            [FromQuery] int? year,
            [FromQuery] int? month)
        {
            var today = SriLankaTime.Today();

            var selectedYear = year ?? today.Year;
            var selectedMonth = month ?? today.Month;

            if (selectedYear < 2000 || selectedYear > 2100 ||
                selectedMonth < 1 || selectedMonth > 12)
            {
                return BadRequest(
                    "Please provide a valid year and month."
                );
            }

            var monthStart = new DateOnly(
                selectedYear,
                selectedMonth,
                1
            );

            var nextMonthStart = monthStart.AddMonths(1);

            // Current active students and classes.
            var totalStudents = await _context.Students
                .CountAsync(s => s.IsActive);

            var totalClasses = await _context.Classes
                .CountAsync(c => c.IsActive);

            // Attendance for the selected month.
            // Only currently active students and classes.
            var monthlyAttendance = await _context.Attendances
                .CountAsync(a =>
                    a.AttendanceDate >= monthStart &&
                    a.AttendanceDate < nextMonthStart &&
                    a.Student != null &&
                    a.Student.IsActive &&
                    a.Class != null &&
                    a.Class.IsActive
                );

            // Preserve today's attendance as a separate metric.
            var todayAttendance = await _context.Attendances
                .CountAsync(a =>
                    a.AttendanceDate == today &&
                    a.Student != null &&
                    a.Student.IsActive &&
                    a.Class != null &&
                    a.Class.IsActive
                );

            // Payments for the selected month.
            // Only currently active students and classes.
            var monthlyPayments = _context.Payments
                .Where(p =>
                    p.Year == selectedYear &&
                    p.Month == selectedMonth &&
                    p.Student != null &&
                    p.Student.IsActive &&
                    p.Class != null &&
                    p.Class.IsActive
                );

            // Count unique students who paid.
            var paidStudents = await monthlyPayments
                .Select(p => p.StudentId)
                .Distinct()
                .CountAsync();

            var totalIncome = await monthlyPayments
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            // Active enrollments for the selected academic year.
            var activeEnrollments = _context.Enrollments
                .Where(e =>
                    e.AcademicYear == selectedYear &&
                    e.IsActive &&
                    e.Student != null &&
                    e.Student.IsActive &&
                    e.Class != null &&
                    e.Class.IsActive
                );

            // A student may be enrolled in multiple classes.
            // Count a student as unpaid if at least one active
            // enrolled class has no payment for the selected month.
            var unpaidStudents = await activeEnrollments
                .Where(e => !_context.Payments.Any(p =>
                    p.StudentId == e.StudentId &&
                    p.ClassId == e.ClassId &&
                    p.Year == selectedYear &&
                    p.Month == selectedMonth
                ))
                .Select(e => e.StudentId)
                .Distinct()
                .CountAsync();

            return Ok(new
            {
                year = selectedYear,
                month = selectedMonth,
                totalStudents,
                totalClasses,
                todayAttendance,
                monthlyAttendance,
                paidStudents,
                unpaidStudents,
                totalIncome
            });
        }

// =========================================
// GET: api/dashboard/daily-collections
// Daily collected income for selected month
// Based on actual payment date (PaidAt)
// =========================================
[HttpGet("daily-collections")]
public async Task<IActionResult> GetDailyCollections(
    [FromQuery] int? year,
    [FromQuery] int? month)
{
    var today = SriLankaTime.Today();

    var selectedYear = year ?? today.Year;
    var selectedMonth = month ?? today.Month;

    if (selectedYear < 2000 || selectedYear > 2100 ||
        selectedMonth < 1 || selectedMonth > 12)
    {
        return BadRequest(
            "Please provide a valid year and month."
        );
    }

    // Sri Lanka month boundaries converted to UTC.
    // Sri Lanka = UTC +05:30.
    var utcMonthStart = new DateTime(
        selectedYear,
        selectedMonth,
        1,
        0,
        0,
        0,
        DateTimeKind.Utc
    )
    .AddHours(-5)
    .AddMinutes(-30);

    var utcNextMonthStart = new DateTime(
        selectedYear,
        selectedMonth,
        1,
        0,
        0,
        0,
        DateTimeKind.Utc
    )
    .AddMonths(1)
    .AddHours(-5)
    .AddMinutes(-30);

    var payments = await _context.Payments
        .Where(p =>
            p.PaidAt >= utcMonthStart &&
            p.PaidAt < utcNextMonthStart
        )
        .Select(p => new
        {
            p.Amount,
            p.PaidAt
        })
        .ToListAsync();

    // Convert UTC payment time to Sri Lanka time
    // before grouping by local date.
    var dailyCollections = payments
        .Select(p => new
        {
            LocalPaidAt = p.PaidAt
                .AddHours(5)
                .AddMinutes(30),

            p.Amount
        })
        .GroupBy(p => p.LocalPaidAt.Date)
        .Select(g => new
        {
            date = g.Key.ToString("yyyy-MM-dd"),
            amount = g.Sum(p => p.Amount),
            paymentCount = g.Count()
        })
        .OrderBy(x => x.date)
        .ToList();

    var totalCollected =
        dailyCollections.Sum(x => x.amount);

    return Ok(new
    {
        year = selectedYear,
        month = selectedMonth,
        totalCollected,
        dailyCollections
    });
}



// =========================================
// GET: api/dashboard/daily-collections/details
// Payment details for selected collection date
// Optional class filter
// =========================================
[HttpGet("daily-collections/details")]
public async Task<IActionResult> GetDailyCollectionDetails(
    [FromQuery] DateOnly date,
    [FromQuery] int? classId)
{
    // Selected Sri Lanka day converted to UTC.
    var utcDayStart = new DateTime(
        date.Year,
        date.Month,
        date.Day,
        0,
        0,
        0,
        DateTimeKind.Utc
    )
    .AddHours(-5)
    .AddMinutes(-30);

    var utcNextDayStart = utcDayStart.AddDays(1);

    // First filter by actual payment date.
    var paymentsQuery = _context.Payments
        .Where(p =>
            p.PaidAt >= utcDayStart &&
            p.PaidAt < utcNextDayStart
        );

    // If a class is selected, filter by that class too.
    if (classId.HasValue)
    {
        paymentsQuery = paymentsQuery
            .Where(p => p.ClassId == classId.Value);
    }

    var payments = await paymentsQuery
        .OrderBy(p => p.PaidAt)
        .Select(p => new
        {
            paymentId = p.Id,

            studentId = p.StudentId,

            studentCode = p.Student != null
                ? p.Student.StudentCode
                : null,

            studentName = p.Student != null
                ? (p.Student.FirstName + " " +
                   (p.Student.LastName ?? "")).Trim()
                : "Unknown Student",

            classId = p.ClassId,

            className = p.Class != null
                ? p.Class.Name
                : "Unknown Class",

            feeYear = p.Year,
            feeMonth = p.Month,

            amount = p.Amount,

            paidAt = p.PaidAt
        })
        .ToListAsync();

    var totalCollected =
        payments.Sum(p => p.amount);

    return Ok(new
    {
        date = date.ToString("yyyy-MM-dd"),
        classId,
        totalCollected,
        paymentCount = payments.Count,
        payments
    });
}

// =========================================
// GET: api/dashboard/monthly-class-summary
// Fee status for each class in selected month
// Month = fee month, NOT actual payment date
// =========================================
[HttpGet("monthly-class-summary")]
public async Task<IActionResult> GetMonthlyClassSummary(
    [FromQuery] int? year,
    [FromQuery] int? month)
{
    var today = SriLankaTime.Today();

    var selectedYear = year ?? today.Year;
    var selectedMonth = month ?? today.Month;

    if (selectedYear < 2000 || selectedYear > 2100 ||
        selectedMonth < 1 || selectedMonth > 12)
    {
        return BadRequest(
            "Please provide a valid year and month."
        );
    }

    // Get active classes.
    var classes = await _context.Classes
        .Where(c => c.IsActive)
        .OrderBy(c => c.Name)
        .Select(c => new
        {
            c.Id,
            c.Name,
            c.Subject,
            c.TeacherName,
            c.MonthlyFee
        })
        .ToListAsync();

    var result = new List<object>();

    foreach (var classItem in classes)
    {
        // Active students enrolled in this class
        // for selected academic year.
        var enrolledStudentIds = await _context.Enrollments
            .Where(e =>
                e.ClassId == classItem.Id &&
                e.AcademicYear == selectedYear &&
                e.IsActive &&
                e.Student != null &&
                e.Student.IsActive
            )
            .Select(e => e.StudentId)
            .Distinct()
            .ToListAsync();

        var totalStudents = enrolledStudentIds.Count;

        // IMPORTANT:
        // Payment is filtered using fee Year + Month.
        // PaidAt is NOT used here.
        var classPayments = await _context.Payments
            .Where(p =>
                p.ClassId == classItem.Id &&
                p.Year == selectedYear &&
                p.Month == selectedMonth &&
                enrolledStudentIds.Contains(p.StudentId)
            )
            .Select(p => new
            {
                p.StudentId,
                p.Amount
            })
            .ToListAsync();

        var paidStudents = classPayments
            .Select(p => p.StudentId)
            .Distinct()
            .Count();

        var unpaidStudents = Math.Max(
            0,
            totalStudents - paidStudents
        );

        var totalCollected = classPayments
            .Sum(p => p.Amount);

        var collectionRate = totalStudents > 0
            ? Math.Round(
                (decimal)paidStudents / totalStudents * 100,
                2
            )
            : 0m;

        result.Add(new
        {
            classId = classItem.Id,
            className = classItem.Name,
            subject = classItem.Subject,
            teacherName = classItem.TeacherName,
            monthlyFee = classItem.MonthlyFee,

            totalStudents,
            paidStudents,
            unpaidStudents,

            totalCollected,
            collectionRate
        });
    }

    return Ok(new
    {
        year = selectedYear,
        month = selectedMonth,
        classes = result
    });
}

// =========================================
// GET: api/dashboard/monthly-class-details
// Student fee status for selected class/month
// Month = fee month, NOT actual payment date
// =========================================
[HttpGet("monthly-class-details")]
public async Task<IActionResult> GetMonthlyClassDetails(
    [FromQuery] int year,
    [FromQuery] int month,
    [FromQuery] int classId)
{
    if (year < 2000 || year > 2100 ||
        month < 1 || month > 12 ||
        classId <= 0)
    {
        return BadRequest(
            "Please provide a valid year, month and classId."
        );
    }

    var classItem = await _context.Classes
        .Where(c =>
            c.Id == classId &&
            c.IsActive
        )
        .Select(c => new
        {
            c.Id,
            c.Name,
            c.Subject,
            c.TeacherName,
            c.MonthlyFee
        })
        .FirstOrDefaultAsync();

    if (classItem == null)
    {
        return NotFound("Class not found.");
    }

    // Students enrolled in selected class/year.
    var enrolledStudents = await _context.Enrollments
        .Where(e =>
            e.ClassId == classId &&
            e.AcademicYear == year &&
            e.IsActive &&
            e.Student != null &&
            e.Student.IsActive
        )
        .Select(e => new
        {
            e.StudentId,

            StudentCode = e.Student!.StudentCode,

            StudentName =
                (e.Student.FirstName + " " +
                (e.Student.LastName ?? "")).Trim(),

            e.Student.Phone
        })
        .Distinct()
        .OrderBy(s => s.StudentName)
        .ToListAsync();

    var studentIds = enrolledStudents
        .Select(s => s.StudentId)
        .ToList();

    // IMPORTANT:
    // Only payments belonging to selected fee month.
    var payments = await _context.Payments
        .Where(p =>
            p.ClassId == classId &&
            p.Year == year &&
            p.Month == month &&
            studentIds.Contains(p.StudentId)
        )
        .Select(p => new
        {
            p.Id,
            p.StudentId,
            p.Amount,
            p.PaidAt
        })
        .ToListAsync();

    var studentDetails = enrolledStudents
        .Select(student =>
        {
            var studentPayments = payments
                .Where(p =>
                    p.StudentId == student.StudentId
                )
                .OrderBy(p => p.PaidAt)
                .ToList();

            var payment = studentPayments
                .FirstOrDefault();

            var totalPaid = studentPayments
                .Sum(p => p.Amount);

            return new
            {
                studentId = student.StudentId,
                studentCode = student.StudentCode,
                studentName = student.StudentName,
                phone = student.Phone,

                status = payment != null
                    ? "Paid"
                    : "Unpaid",

                amount = totalPaid,

                paidAt = payment?.PaidAt
            };
        })
        .ToList();

    var paidStudents = studentDetails
        .Count(s => s.status == "Paid");

    var unpaidStudents = studentDetails
        .Count(s => s.status == "Unpaid");

    var totalCollected = studentDetails
        .Sum(s => s.amount);

    var collectionRate = studentDetails.Count > 0
        ? Math.Round(
            (decimal)paidStudents /
            studentDetails.Count * 100,
            2
        )
        : 0m;

    return Ok(new
    {
        year,
        month,

        classId = classItem.Id,
        className = classItem.Name,
        subject = classItem.Subject,
        teacherName = classItem.TeacherName,
        monthlyFee = classItem.MonthlyFee,

        totalStudents = studentDetails.Count,
        paidStudents,
        unpaidStudents,
        totalCollected,
        collectionRate,

        students = studentDetails
    });
}

    }
}
