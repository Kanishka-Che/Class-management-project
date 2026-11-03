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
    public class StudentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudentsController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<bool> CanAccessClass(int classId)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            // Admin can access every class
            if (role == "Admin")
            {
                return true;
            }

            // Get logged-in Staff user ID from JWT
            var userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(userIdClaim, out var userId))
            {
                return false;
            }

            // Staff can access assigned classes only
            return await _context.UserClasses
                .AnyAsync(uc =>
                    uc.UserId == userId &&
                    uc.ClassId == classId);
        }

        private async Task<bool> CanAccessStudent(int studentId)
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

    return await _context.Enrollments
        .AnyAsync(e =>
            e.StudentId == studentId &&
            e.IsActive &&
            _context.UserClasses.Any(uc =>
                uc.UserId == userId &&
                uc.ClassId == e.ClassId
            )
        );
}

       // =========================================
// GET: api/students
// Admin -> all active students
// Staff -> students in assigned classes only
// =========================================
[HttpGet]
public async Task<ActionResult<IEnumerable<StudentResponse>>> GetStudents()
{
    var role = User.FindFirst(ClaimTypes.Role)?.Value;

    // =========================================
    // ADMIN
    // =========================================
    if (role == "Admin")
    {
        var adminStudents = await _context.Students
            .Where(s => s.IsActive)
            .OrderBy(s => s.StudentCode)
            .Select(s => new StudentResponse
            {
                Id = s.Id,
                StudentCode = s.StudentCode,
                FirstName = s.FirstName,
                LastName = s.LastName,
                DateOfBirth = s.DateOfBirth,
                Gender = s.Gender,
                Phone = s.Phone,
                ParentName = s.ParentName,
                ParentPhone = s.ParentPhone,
                Address = s.Address,
                School = s.School,
                QrToken = s.QrToken,
                IsActive = s.IsActive,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return Ok(adminStudents);
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

    var staffStudents = await _context.Enrollments
        .Where(e =>
            e.IsActive &&
            e.Student != null &&
            e.Student.IsActive &&
            _context.UserClasses.Any(uc =>
                uc.UserId == userId &&
                uc.ClassId == e.ClassId
            )
        )
        .Select(e => e.Student!)
        .Distinct()
        .OrderBy(s => s.StudentCode)
        .Select(s => new StudentResponse
        {
            Id = s.Id,
            StudentCode = s.StudentCode,
            FirstName = s.FirstName,
            LastName = s.LastName,
            DateOfBirth = s.DateOfBirth,
            Gender = s.Gender,
            Phone = s.Phone,
            ParentName = s.ParentName,
            ParentPhone = s.ParentPhone,
            Address = s.Address,
            School = s.School,
            QrToken = s.QrToken,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        })
        .ToListAsync();

    return Ok(staffStudents);
}

        // =========================================
        // GET: api/students/inactive
        // Get all inactive students
        // Admin only
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpGet("inactive")]
        public async Task<ActionResult<IEnumerable<StudentResponse>>> GetInactiveStudents()
        {
            var students = await _context.Students
                .Where(s => !s.IsActive)
                .OrderBy(s => s.StudentCode)
                .Select(s => new StudentResponse
                {
                    Id = s.Id,
                    StudentCode = s.StudentCode,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    DateOfBirth = s.DateOfBirth,
                    Gender = s.Gender,
                    Phone = s.Phone,
                    ParentName = s.ParentName,
                    ParentPhone = s.ParentPhone,
                    Address = s.Address,
                    School = s.School,
                    QrToken = s.QrToken,
                    IsActive = s.IsActive,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt
                })
                .ToListAsync();

            return Ok(students);
        }

        // =========================================
        // GET: api/students/{id}
        // Get student by ID
        // =========================================
       [HttpGet("{id}")]
public async Task<ActionResult<StudentResponse>> GetStudent(int id)
{
    var role = User.FindFirst(ClaimTypes.Role)?.Value;

    // Staff can only view students from assigned classes
    if (role != "Admin")
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Invalid user.");
        }

        var hasAccess = await _context.Enrollments
            .AnyAsync(e =>
                e.StudentId == id &&
                e.IsActive &&
                _context.UserClasses.Any(uc =>
                    uc.UserId == userId &&
                    uc.ClassId == e.ClassId
                )
            );

        if (!hasAccess)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                "You do not have access to this student."
            );
        }
    }

    var student = await _context.Students
        .Where(s => s.Id == id)
        .Select(s => new StudentResponse
        {
            Id = s.Id,
            StudentCode = s.StudentCode,
            FirstName = s.FirstName,
            LastName = s.LastName,
            DateOfBirth = s.DateOfBirth,
            Gender = s.Gender,
            Phone = s.Phone,
            ParentName = s.ParentName,
            ParentPhone = s.ParentPhone,
            Address = s.Address,
            School = s.School,
            QrToken = s.QrToken,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,

            JoinedDate = _context.Enrollments
                .Where(e => e.StudentId == s.Id)
                .OrderByDescending(e => e.AcademicYear)
                .Select(e =>
                    (DateOnly?)DateOnly.FromDateTime(
                        e.JoinedDate
                    )
                )
                .FirstOrDefault()
        })
        .FirstOrDefaultAsync();

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    return Ok(student);
}

        // =========================================
        // GET: api/students/code/{studentCode}
        // Search student using student code
        // =========================================
        [HttpGet("code/{studentCode}")]
public async Task<ActionResult<StudentResponse>> GetStudentByCode(
    string studentCode)
{
    var student = await _context.Students
        .Where(s =>
            s.StudentCode == studentCode &&
            s.IsActive)
        .Select(s => new StudentResponse
        {
            Id = s.Id,
            StudentCode = s.StudentCode,
            FirstName = s.FirstName,
            LastName = s.LastName,
            DateOfBirth = s.DateOfBirth,
            Gender = s.Gender,
            Phone = s.Phone,
            ParentName = s.ParentName,
            ParentPhone = s.ParentPhone,
            Address = s.Address,
            School = s.School,
            QrToken = s.QrToken,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        })
        .FirstOrDefaultAsync();

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    if (!await CanAccessStudent(student.Id))
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to this student."
        );
    }

    return Ok(student);
}


        // =========================================
        // GET: api/students/qr/{qrToken}
        // Search student using QR token
        // =========================================
        
        [HttpGet("qr/{qrToken}")]
public async Task<ActionResult<StudentResponse>> GetStudentByQrToken(
    string qrToken)
{
    var student = await _context.Students
        .Where(s =>
            s.QrToken == qrToken &&
            s.IsActive)
        .Select(s => new StudentResponse
        {
            Id = s.Id,
            StudentCode = s.StudentCode,
            FirstName = s.FirstName,
            LastName = s.LastName,
            DateOfBirth = s.DateOfBirth,
            Gender = s.Gender,
            Phone = s.Phone,
            ParentName = s.ParentName,
            ParentPhone = s.ParentPhone,
            Address = s.Address,
            School = s.School,
            QrToken = s.QrToken,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        })
        .FirstOrDefaultAsync();

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    if (!await CanAccessStudent(student.Id))
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to this student."
        );
    }

    return Ok(student);
}

        // =========================================
        // POST: api/students
        // Create new student
        // =========================================
       [Authorize(Roles = "Admin")]
[HttpPost]
public async Task<ActionResult<Student>> CreateStudent(
    CreateStudentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                return BadRequest("First name is required.");
            }

            if (request.DateOfBirth.HasValue &&
                request.DateOfBirth.Value >
                DateOnly.FromDateTime(DateTime.UtcNow))
            {
                return BadRequest(
                    "Date of birth cannot be in the future."
                );
            }

            var lastStudent = await _context.Students
                .OrderByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            int nextNumber = lastStudent == null
                ? 1
                : lastStudent.Id + 1;

            var student = new Student
            {
                StudentCode = $"STD-{nextNumber:D4}",

                FirstName = request.FirstName,
                LastName = request.LastName,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                Phone = request.Phone,
                ParentName = request.ParentName,
                ParentPhone = request.ParentPhone,
                Address = request.Address,
                School = request.School,

                QrToken = Guid.NewGuid().ToString(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Students.Add(student);

            await _context.SaveChangesAsync();

            return Ok(ToStudentResponse(student));
        }

        // =========================================
// POST: api/students/with-enrollment
// Create student and enroll in class
// =========================================
[HttpPost("with-enrollment")]
public async Task<IActionResult> CreateStudentWithEnrollment(
    CreateStudentWithEnrollmentRequest request)
{

    if (!await CanAccessClass(request.ClassId))
{
    return StatusCode(
        StatusCodes.Status403Forbidden,
        "You do not have access to this class."
    );
}

    // =========================================
    // Validate Student
    // =========================================
    if (string.IsNullOrWhiteSpace(request.FirstName))
    {
        return BadRequest("First name is required.");
    }

    if (request.DateOfBirth.HasValue &&
        request.DateOfBirth.Value >
        DateOnly.FromDateTime(DateTime.UtcNow))
    {
        return BadRequest(
            "Date of birth cannot be in the future."
        );
    }

    // =========================================
    // Validate Academic Year
    // =========================================
    if (request.AcademicYear < 2000 ||
        request.AcademicYear > 2100)
    {
        return BadRequest("Invalid academic year.");
    }

    // =========================================
    // Check Class
    // =========================================
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
    // Start Database Transaction
    // =========================================
    await using var transaction =
        await _context.Database.BeginTransactionAsync();

    try
    {
        // =========================================
        // Generate Student Code
        // =========================================
        var lastStudent = await _context.Students
            .OrderByDescending(s => s.Id)
            .FirstOrDefaultAsync();

        int nextNumber = lastStudent == null
            ? 1
            : lastStudent.Id + 1;

        // =========================================
        // Create Student
        // =========================================
        var student = new Student
        {
            StudentCode = $"STD-{nextNumber:D4}",

            FirstName = request.FirstName,
            LastName = request.LastName,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            Phone = request.Phone,
            ParentName = request.ParentName,
            ParentPhone = request.ParentPhone,
            Address = request.Address,
            School = request.School,

            QrToken = Guid.NewGuid().ToString(),

            IsActive = true,

            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Students.Add(student);

        // Save first so Student ID is generated
        await _context.SaveChangesAsync();

        // =========================================
        // Create Enrollment
        // =========================================
        var enrollment = new Enrollment
        {
            StudentId = student.Id,
            ClassId = request.ClassId,
            AcademicYear = request.AcademicYear,
            JoinedDate = request.JoinedDate.HasValue
                ? DateTime.SpecifyKind(
                    request.JoinedDate.Value.ToDateTime(TimeOnly.MinValue),
                    DateTimeKind.Utc
                  )
                : DateTime.UtcNow,
        };

        _context.Enrollments.Add(enrollment);

        await _context.SaveChangesAsync();

        // =========================================
        // Commit Transaction
        // =========================================
        await transaction.CommitAsync();

        return Ok(new
        {
            message =
                "Student created and enrolled successfully.",

            student = ToStudentResponse(student),

            enrollment = new
            {
                enrollment.Id,
                enrollment.StudentId,
                enrollment.ClassId,
                enrollment.AcademicYear,
                enrollment.JoinedDate,
                enrollment.IsActive
            }
        });
    }
    catch (Exception)
    {
        // =========================================
        // Rollback
        // =========================================
        await transaction.RollbackAsync();

        return StatusCode(
            500,
            "Failed to create student and enrollment."
        );
    }
}

       // =========================================
        // PUT: api/students/{id}
        // Update student personal information and enrollment joined date
        // =========================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStudent(
            int id,
            UpdateStudentRequest request)
        {

            if (!await CanAccessStudent(id))
{
    return StatusCode(
        StatusCodes.Status403Forbidden,
        "You do not have access to this student."
    );
}

            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                return BadRequest("First name is required.");
            }

            if (request.DateOfBirth.HasValue &&
                request.DateOfBirth.Value >
                DateOnly.FromDateTime(DateTime.UtcNow))
            {
                return BadRequest(
                    "Date of birth cannot be in the future."
                );
            }

            var student = await _context.Students
                .FindAsync(id);

            if (student == null)
            {
                return NotFound("Student not found.");
            }

            student.FirstName = request.FirstName;
            student.LastName = request.LastName;
            student.DateOfBirth = request.DateOfBirth;
            student.Gender = request.Gender;
            student.Phone = request.Phone;
            student.ParentName = request.ParentName;
            student.ParentPhone = request.ParentPhone;
            student.Address = request.Address;
            student.School = request.School;
            student.UpdatedAt = DateTime.UtcNow;

            if (request.JoinedDate.HasValue)
{
    var role = User.FindFirst(ClaimTypes.Role)?.Value;

    IQueryable<Enrollment> enrollmentQuery =
        _context.Enrollments
            .Where(e => e.StudentId == id);

    if (role != "Admin")
    {
        var userIdClaim =
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        if (!int.TryParse(
                userIdClaim,
                out var userId))
        {
            return Unauthorized("Invalid user.");
        }

        enrollmentQuery = enrollmentQuery
            .Where(e =>
                _context.UserClasses.Any(uc =>
                    uc.UserId == userId &&
                    uc.ClassId == e.ClassId
                )
            );
    }

    var enrollments =
        await enrollmentQuery.ToListAsync();

    foreach (var enrollment in enrollments)
    {
        enrollment.JoinedDate =
            DateTime.SpecifyKind(
                request.JoinedDate.Value
                    .ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc
            );
    }
}

            await _context.SaveChangesAsync();

            return Ok(ToStudentResponse(student));
        }

        // =========================================
        // DELETE: api/students/{id}
        // Soft delete / deactivate student
        // =========================================
        [HttpDelete("{id}")]
public async Task<IActionResult> DeactivateStudent(
    int id)
{
    if (!await CanAccessStudent(id))
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            "You do not have access to this student."
        );
    }

    var student = await _context.Students
        .FindAsync(id);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    student.IsActive = false;
    student.UpdatedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();

    return Ok(ToStudentResponse(student));
}

        // =========================================
        // PATCH: api/students/{id}/activate
        // Reactivate student
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> ActivateStudent(
            int id)
        {
            var student = await _context.Students
                .FindAsync(id);

            if (student == null)
            {
                return NotFound("Student not found.");
            }

            student.IsActive = true;
            student.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ToStudentResponse(student));
        }

        
// DELETE: api/students/{id}/permanent
// Permanently delete a student and related records.
// Admin only.


[Authorize(Roles = "Admin")]
[HttpDelete("{id}/permanent")]
public async Task<IActionResult> PermanentlyDeleteStudent(int id)
{
    var student = await _context.Students
        .FirstOrDefaultAsync(s => s.Id == id);

    if (student == null)
    {
        return NotFound("Student not found.");
    }

    await using var transaction =
        await _context.Database.BeginTransactionAsync();

    try
    {
        // Delete all related payments.
        await _context.Payments
            .Where(p => p.StudentId == id)
            .ExecuteDeleteAsync();

        // Delete all related attendance records.
        await _context.Attendances
            .Where(a => a.StudentId == id)
            .ExecuteDeleteAsync();

        // Delete all related enrollments.
        await _context.Enrollments
            .Where(e => e.StudentId == id)
            .ExecuteDeleteAsync();

        // Delete the student.
        _context.Students.Remove(student);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(new
        {
            message = "Student permanently deleted.",
            studentId = id
        });
    }
    catch (Exception)
    {
        await transaction.RollbackAsync();

        return StatusCode(
            500,
            "Failed to permanently delete student."
        );
    }
}


// =========================================
        // PUT: api/enrollments/student/{studentId}/year/{year}
        // Update enrollment class or joined date
        // =========================================
//        [HttpPut("student/{studentId}/year/{year}")]
// public async Task<IActionResult> UpdateEnrollment(
//     int studentId, int year, UpdateEnrollmentRequest request)
// {
//     var enrollment = await _context.Enrollments
//         .FirstOrDefaultAsync(e => e.StudentId == studentId && e.AcademicYear == year);

//     if (enrollment == null)
//         return NotFound("Enrollment not found for this academic year.");

//     if (request.ClassId > 0)
//     {
//         var classItem = await _context.Classes.FindAsync(request.ClassId);
//         if (classItem == null || !classItem.IsActive)
//             return BadRequest("Invalid or inactive class.");

//         enrollment.ClassId = request.ClassId;
//     }

//     if (request.JoinedDate.HasValue)
//     {
//         enrollment.JoinedDate = DateTime.SpecifyKind(
//             request.JoinedDate.Value.ToDateTime(TimeOnly.MinValue),
//             DateTimeKind.Utc);
//     }

//     await _context.SaveChangesAsync();
//     return Ok(new { message = "Enrollment updated successfully." });
// }


        // =========================================
        // Convert Student to StudentResponse
        // =========================================
        private static StudentResponse ToStudentResponse(
            Student student)
        {
            return new StudentResponse
            {
                Id = student.Id,
                StudentCode = student.StudentCode,
                FirstName = student.FirstName,
                LastName = student.LastName,
                DateOfBirth = student.DateOfBirth,
                Gender = student.Gender,
                Phone = student.Phone,
                ParentName = student.ParentName,
                ParentPhone = student.ParentPhone,
                Address = student.Address,
                School = student.School,
                QrToken = student.QrToken,
                IsActive = student.IsActive,
                CreatedAt = student.CreatedAt,
                UpdatedAt = student.UpdatedAt
            };
        }
    }
}