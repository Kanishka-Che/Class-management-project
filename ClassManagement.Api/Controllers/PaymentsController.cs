using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ClassManagement.Api.DTOs;
using ClassManagement.Api.Services;
using System.Security.Claims;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly AppDbContext _context;
private readonly ISmsService _smsService;
private readonly ClassFeeService _classFeeService;

public PaymentsController(
    AppDbContext context,
    ISmsService smsService,
    ClassFeeService classFeeService)
{
    _context = context;
    _smsService = smsService;
    _classFeeService = classFeeService;
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
        // POST: api/payments
        // Record monthly payment
        // =========================================
      [HttpPost]
public async Task<IActionResult> CreatePayment(
    CreatePaymentRequest request)
{
    if (!await CanAccessClass(request.ClassId))
{
    return StatusCode(
        StatusCodes.Status403Forbidden,
        "You do not have access to this class."
    );
}

    // Validate month
    if (request.Month < 1 || request.Month > 12)
    {
        return BadRequest("Month must be between 1 and 12.");
    }

    // Validate year
    if (request.Year < 2000 || request.Year > 2100)
    {
        return BadRequest("Invalid year.");
    }

    // Check student
    var student = await _context.Students
        .FindAsync(request.StudentId);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

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

    if (!classItem.IsActive)
    {
        return BadRequest("Class is inactive.");
    }

    // Check enrollment
    var enrollment = await _context.Enrollments
        .FirstOrDefaultAsync(e =>
            e.StudentId == request.StudentId &&
            e.ClassId == request.ClassId &&
            e.AcademicYear == request.Year &&
            e.IsActive);

    if (enrollment == null)
    {
        return BadRequest(
            "Student is not enrolled in this class."
        );
    }

    // Prevent duplicate monthly payment
    var existingPayment = await _context.Payments
        .FirstOrDefaultAsync(p =>
            p.StudentId == request.StudentId &&
            p.ClassId == request.ClassId &&
            p.Year == request.Year &&
            p.Month == request.Month);

    if (existingPayment != null)
    {
        return BadRequest(
            "Payment already recorded for this month."
        );
    }

    // =========================================
// Get historical fee for requested month
// =========================================

var historicalFee = await _classFeeService
    .GetMonthlyFeeAsync(
        request.ClassId,
        request.Year,
        request.Month
    );

if (historicalFee == null)
{
    return BadRequest(new
    {
        message =
            "Historical monthly fee is not configured " +
            "for this class and month."
    });
}

    // Backend controls Amount and PaidAt
    var payment = new Payment
    {
        StudentId = request.StudentId,
        ClassId = request.ClassId,
        Year = request.Year,
        Month = request.Month,
       Amount = historicalFee.Value,
        PaidAt = DateTime.UtcNow
    };

    _context.Payments.Add(payment);
    await _context.SaveChangesAsync();

    // Send payment confirmation SMS
var smsPhoneNumber =
    !string.IsNullOrWhiteSpace(student.ParentPhone)
        ? student.ParentPhone
        : student.Phone;

if (!string.IsNullOrWhiteSpace(smsPhoneNumber))
{
    var studentName =
        $"{student.FirstName} {student.LastName}".Trim();

    var smsMessage =
        $"Payment received. " +
        $"Student: {studentName}, " +
        $"Class: {classItem.Name}, " +
        $"Month: {request.Month}/{request.Year}, " +
        $"Amount: LKR {payment.Amount:N2}. Thank you.";

   try
{
    await _smsService.SendSmsAsync(
        smsPhoneNumber,
        smsMessage
    );
}
catch (Exception ex)
{
    Console.Error.WriteLine(
        $"Payment {payment.Id} saved, but SMS failed: {ex.Message}"
    );
}
}

    return Ok(new PaymentResponse
{
    Id = payment.Id,

    StudentId = student.Id,
    StudentCode = student.StudentCode,
    StudentName =
        $"{student.FirstName} {student.LastName}".Trim(),

    ClassId = classItem.Id,
    ClassName = classItem.Name,

    Year = payment.Year,
    Month = payment.Month,
    Amount = payment.Amount,
    PaidAt = payment.PaidAt
});
}

        // =========================================
        // GET: api/payments/student/{studentId}
        // Student payment history
        // =========================================
       [HttpGet("student/{studentId}")]
public async Task<IActionResult> GetStudentPaymentHistory(
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
    // ADMIN -> Full payment history
    // =========================================
    if (role == "Admin")
    {
        var adminPayments = await _context.Payments
            .Where(p => p.StudentId == studentId)
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
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

        return Ok(adminPayments);
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

    // Check whether this Staff user has access
    // to this student through an assigned class.
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

    // Staff sees payment history only for
    // classes assigned to this Staff user.
    var staffPayments = await _context.Payments
        .Where(p =>
            p.StudentId == studentId &&
            _context.UserClasses.Any(uc =>
                uc.UserId == userId &&
                uc.ClassId == p.ClassId
            )
        )
        .OrderByDescending(p => p.Year)
        .ThenByDescending(p => p.Month)
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

    return Ok(staffPayments);
}

        // =========================================
        // GET:
        // api/payments/class/{classId}/year/{year}/month/{month}
        // Get paid students for a month
        // =========================================
        [HttpGet("class/{classId}/year/{year}/month/{month}")]
        public async Task<IActionResult> GetClassPaymentsByMonth(
            int classId,
            int year,
            int month)
        {
            var validationResult =
                await ValidateClassYearMonth(classId, year, month);

            if (validationResult != null)
            {
                return validationResult;
            }

            var payments = await _context.Payments
    .Where(p =>
        p.ClassId == classId &&
        p.Year == year &&
        p.Month == month)
    .OrderBy(p => p.Student!.StudentCode)
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

            return Ok(payments);
        }

        // =========================================
        // GET:
        // api/payments/class/{classId}/year/{year}/month/{month}/unpaid
        // Get unpaid students
        // =========================================
        [HttpGet("class/{classId}/year/{year}/month/{month}/unpaid")]
        public async Task<IActionResult> GetUnpaidStudents(
            int classId,
            int year,
            int month)
        {
            var validationResult =
                await ValidateClassYearMonth(classId, year, month);

            if (validationResult != null)
            {
                return validationResult;
            }

            var enrolledStudents = await _context.Enrollments
                .Where(e =>
                    e.ClassId == classId &&
                    e.AcademicYear == year &&
                    e.IsActive)
                .Include(e => e.Student)
                .ToListAsync();

            var paidStudentIds = await _context.Payments
                .Where(p =>
                    p.ClassId == classId &&
                    p.Year == year &&
                    p.Month == month)
                .Select(p => p.StudentId)
                .ToListAsync();

            var unpaidStudents = enrolledStudents
    .Where(e =>
        e.Student != null &&
        e.Student.IsActive &&
        !paidStudentIds.Contains(e.StudentId))
    .Select(e => new StudentResponse
    {
        Id = e.Student!.Id,
        StudentCode = e.Student.StudentCode,
        FirstName = e.Student.FirstName,
        LastName = e.Student.LastName,
        DateOfBirth = e.Student.DateOfBirth,
        Gender = e.Student.Gender,
        Phone = e.Student.Phone,
        ParentName = e.Student.ParentName,
        ParentPhone = e.Student.ParentPhone,
        Address = e.Student.Address,
        School = e.Student.School,
        QrToken = e.Student.QrToken,
        IsActive = e.Student.IsActive,
        CreatedAt = e.Student.CreatedAt,
        UpdatedAt = e.Student.UpdatedAt
    })
    .ToList();

            return Ok(unpaidStudents);
        }

        // =========================================
        // GET:
        // api/payments/class/{classId}/year/{year}/month/{month}/summary
        // Monthly payment summary
        // =========================================
        [HttpGet("class/{classId}/year/{year}/month/{month}/summary")]
        public async Task<IActionResult> GetPaymentSummary(
            int classId,
            int year,
            int month)
        {
            var validationResult =
                await ValidateClassYearMonth(classId, year, month);

            if (validationResult != null)
            {
                return validationResult;
            }

            var totalStudents = await _context.Enrollments
                .CountAsync(e =>
                    e.ClassId == classId &&
                    e.AcademicYear == year &&
                    e.IsActive &&
                    e.Student != null &&
                    e.Student.IsActive);

            var payments = await _context.Payments
                .Where(p =>
                    p.ClassId == classId &&
                    p.Year == year &&
                    p.Month == month)
                .ToListAsync();

            var paidStudents = payments.Count;
            var unpaidStudents = Math.Max(
                0,
                totalStudents - paidStudents
            );

            var totalCollected = payments.Sum(p => p.Amount);

            return Ok(new
            {
                classId,
                year,
                month,
                totalStudents,
                paidStudents,
                unpaidStudents,
                totalCollected
            });
        }

        // =========================================
        // Common validation for payment reports
        // =========================================
       private async Task<IActionResult?> ValidateClassYearMonth(
    int classId,
    int year,
    int month)
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

    var classExists = await _context.Classes
        .AnyAsync(c =>
            c.Id == classId &&
            c.IsActive);

    if (!classExists)
    {
        return NotFound("Class not found.");
    }

    if (!await CanAccessClass(classId))
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to this class."
        );
    }

    return null;
}
    }
}