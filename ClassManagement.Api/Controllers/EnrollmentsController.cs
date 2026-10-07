using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ClassManagement.Api.DTOs;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnrollmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EnrollmentsController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // POST: api/enrollments
        // Enroll student in a class
        // =========================================
   [Authorize(Roles = "Admin")]
[HttpPost]
public async Task<IActionResult> CreateEnrollment(
    CreateEnrollmentRequest request)
{
    if (request.AcademicYear < 2000 || request.AcademicYear > 2100)
    {
        return BadRequest("Invalid academic year.");
    }

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

    var existingEnrollment = await _context.Enrollments
        .FirstOrDefaultAsync(e =>
            e.StudentId == request.StudentId &&
            e.AcademicYear == request.AcademicYear);

    if (existingEnrollment != null)
    {
        return BadRequest(
            "Student is already enrolled for this academic year."
        );
    }

    var enrollment = new Enrollment
    {
        StudentId = request.StudentId,
        ClassId = request.ClassId,
        AcademicYear = request.AcademicYear,
        JoinedDate = DateTime.UtcNow,
        IsActive = true
    };

    _context.Enrollments.Add(enrollment);
    await _context.SaveChangesAsync();

    return Ok(enrollment);
}

        // =========================================
        // GET:
        // api/enrollments/class/{classId}/year/{academicYear}
        // Get students enrolled in a class
        // =========================================
    [HttpGet("class/{classId}/year/{academicYear}")]
public async Task<IActionResult> GetStudentsByClass(
    int classId,
    int academicYear)
{
    var classItem = await _context.Classes.FindAsync(classId);

    if (classItem == null)
    {
        return NotFound("Class not found.");
    }

    var enrollments = await _context.Enrollments
        .Where(e =>
            e.ClassId == classId &&
            e.AcademicYear == academicYear &&
            e.IsActive)
        .OrderBy(e => e.Student!.StudentCode)
        .Select(e => new EnrollmentResponse
        {
            Id = e.Id,
            StudentId = e.StudentId,
            StudentCode = e.Student!.StudentCode,
            StudentName =
                (e.Student.FirstName + " " +
                 (e.Student.LastName ?? "")).Trim(),

            ClassId = e.ClassId,
            ClassName = e.Class!.Name,

            AcademicYear = e.AcademicYear,
            JoinedDate = e.JoinedDate,
            IsActive = e.IsActive
        })
        .ToListAsync();

    return Ok(enrollments);
}

        // =========================================
        // GET:
        // api/enrollments/student/{studentId}/year/{academicYear}
        // Get student's enrollment for a year
        // =========================================
       [HttpGet("student/{studentId}/year/{academicYear}")]
public async Task<IActionResult> GetStudentEnrollment(
    int studentId,
    int academicYear)
{
    var student = await _context.Students.FindAsync(studentId);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    var enrollment = await _context.Enrollments
        .Where(e =>
            e.StudentId == studentId &&
            e.AcademicYear == academicYear &&
            e.IsActive)
        .Select(e => new EnrollmentResponse
        {
            Id = e.Id,
            StudentId = e.StudentId,
            StudentCode = e.Student!.StudentCode,
            StudentName =
                (e.Student.FirstName + " " +
                 (e.Student.LastName ?? "")).Trim(),

            ClassId = e.ClassId,
            ClassName = e.Class!.Name,

            AcademicYear = e.AcademicYear,
            JoinedDate = e.JoinedDate,
            IsActive = e.IsActive
        })
        .FirstOrDefaultAsync();

    if (enrollment == null)
    {
        return NotFound("Enrollment not found.");
    }

    return Ok(enrollment);
}

// =========================================
// PUT:
// api/enrollments/student/{studentId}/year/{academicYear}
// Change student's class for an academic year
// =========================================
[Authorize(Roles = "Admin")]
[HttpPut("student/{studentId}/year/{academicYear}")]
public async Task<IActionResult> UpdateStudentEnrollment(
    int studentId,
    int academicYear,
    CreateEnrollmentRequest request)
{
    if (academicYear < 2000 || academicYear > 2100)
    {
        return BadRequest("Invalid academic year.");
    }

    var student = await _context.Students
        .FindAsync(studentId);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    if (!student.IsActive)
    {
        return BadRequest("Student is inactive.");
    }

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

    var enrollment = await _context.Enrollments
        .FirstOrDefaultAsync(e =>
            e.StudentId == studentId &&
            e.AcademicYear == academicYear &&
            e.IsActive);

    if (enrollment == null)
    {
        return NotFound(
            "Enrollment not found for this academic year."
        );
    }

    enrollment.ClassId = request.ClassId;

    await _context.SaveChangesAsync();

    return Ok(new EnrollmentResponse
    {
        Id = enrollment.Id,

        StudentId = student.Id,
        StudentCode = student.StudentCode,

        StudentName =
            (student.FirstName + " " +
             (student.LastName ?? "")).Trim(),

        ClassId = classItem.Id,
        ClassName = classItem.Name,

        AcademicYear = enrollment.AcademicYear,
        JoinedDate = enrollment.JoinedDate,
        IsActive = enrollment.IsActive
    });
}
    }
}