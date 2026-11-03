using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ClassManagement.Api.DTOs;
using System.Security.Claims;


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
        JoinedDate = request.JoinedDate.HasValue
    ? DateTime.SpecifyKind(
        request.JoinedDate.Value.ToDateTime(TimeOnly.MinValue),
        DateTimeKind.Utc)
    : DateTime.UtcNow,
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
    var student = await _context.Students
        .FindAsync(studentId);

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

    if (!await CanAccessClass(enrollment.ClassId))
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to this student's class."
        );
    }

    return Ok(enrollment);
}

// =========================================
// PUT:
// api/enrollments/student/{studentId}/year/{academicYear}
// Change student's class for an academic year
// =========================================
[HttpPut("student/{studentId}/year/{academicYear}")]
public async Task<IActionResult> UpdateStudentEnrollment(
    int studentId,
    int academicYear,
    CreateEnrollmentRequest request)
{
    if (academicYear < 2000 ||
        academicYear > 2100)
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

    // =========================================
    // Find Current Enrollment
    // =========================================
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

    // =========================================
    // Staff must have access to CURRENT class
    // =========================================
    if (!await CanAccessClass(enrollment.ClassId))
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to the student's current class."
        );
    }

    // =========================================
    // Staff must also have access to TARGET class
    // =========================================
    if (!await CanAccessClass(request.ClassId))
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to the selected class."
        );
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

    // =========================================
    // Update Class
    // =========================================
    enrollment.ClassId = request.ClassId;

    // =========================================
    // Update Joined Date
    // =========================================
    if (request.JoinedDate.HasValue)
    {
        enrollment.JoinedDate =
            DateTime.SpecifyKind(
                request.JoinedDate.Value
                    .ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc
            );
    }

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

// =========================================
// DTO for Promotion Request
// =========================================
public class PromoteStudentsRequest
{
    public int FromClassId { get; set; }
    public int FromAcademicYear { get; set; }
    public int ToClassId { get; set; }
    public int ToAcademicYear { get; set; }
}

// =========================================
// POST: api/enrollments/promote
// Bulk promote/enroll students from one class/year to another
// =========================================
[Authorize(Roles = "Admin")]
[HttpPost("promote")]
public async Task<IActionResult> PromoteStudents([FromBody] PromoteStudentsRequest request)
{
    
    if (request.ToAcademicYear < 2000 || request.ToAcademicYear > 2100)
    {
        return BadRequest("Invalid target academic year.");
    }

    if (request.FromClassId == request.ToClassId && request.FromAcademicYear == request.ToAcademicYear)
    {
        return BadRequest("Source and target class/year cannot be the same.");
    }

  
    var sourceEnrollments = await _context.Enrollments
        .Where(e => e.ClassId == request.FromClassId 
                 && e.AcademicYear == request.FromAcademicYear 
                 && e.IsActive)
        .ToListAsync();

    if (!sourceEnrollments.Any())
    {
        return NotFound("No active students found in the source class for the given academic year.");
    }

    int promotedCount = 0;
    int alreadyEnrolledCount = 0;

    foreach (var oldEnrollment in sourceEnrollments)
    {
       
        var existingTargetEnrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.StudentId == oldEnrollment.StudentId 
                                   && e.ClassId == request.ToClassId 
                                   && e.AcademicYear == request.ToAcademicYear);

        if (existingTargetEnrollment != null)
        {
            alreadyEnrolledCount++;
            continue;
        }

        
        var newEnrollment = new Enrollment
        {
            StudentId = oldEnrollment.StudentId,
            ClassId = request.ToClassId,
            AcademicYear = request.ToAcademicYear,
            JoinedDate = oldEnrollment.JoinedDate,
            IsActive = true
        };

        _context.Enrollments.Add(newEnrollment);
        promotedCount++;
    }

    await _context.SaveChangesAsync();

    
    return Ok(new
    {
        message = $"Successfully promoted {promotedCount} students. ({alreadyEnrolledCount} already enrolled)",
        promotedCount,
        alreadyEnrolledCount
    });
}

    }
}