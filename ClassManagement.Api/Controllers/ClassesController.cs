using ClassManagement.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ClassManagement.Api.DTOs;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClassesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClassesController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // GET: api/classes
        // Get all active classes
        // Admin + Staff
        // =========================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ClassResponse>>> GetClasses()
        {
            var classes = await _context.Classes
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new ClassResponse
                {
                    Id = c.Id,
                    Name = c.Name,
                    Subject = c.Subject,
                    TeacherName = c.TeacherName,
                    MonthlyFee = c.MonthlyFee,
                    Day = c.Day,
                    StartTime = c.StartTime,
                    IsActive = c.IsActive
                })
                .ToListAsync();

            return Ok(classes);
        }

        // =========================================
        // GET: api/classes/inactive
        // Get all inactive classes
        // Admin only
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpGet("inactive")]
        public async Task<ActionResult<IEnumerable<ClassResponse>>> GetInactiveClasses()
        {
            var classes = await _context.Classes
                .Where(c => !c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new ClassResponse
                {
                    Id = c.Id,
                    Name = c.Name,
                    Subject = c.Subject,
                    TeacherName = c.TeacherName,
                    MonthlyFee = c.MonthlyFee,
                    Day = c.Day,
                    StartTime = c.StartTime,
                    IsActive = c.IsActive
                })
                .ToListAsync();

            return Ok(classes);
        }

        // =========================================
        // GET: api/classes/{id}
        // Get class by ID
        // Admin + Staff
        // =========================================
        [HttpGet("{id}")]
        public async Task<ActionResult<ClassResponse>> GetClassById(int id)
        {
            var classItem = await _context.Classes
                .Where(c => c.Id == id)
                .Select(c => new ClassResponse
                {
                    Id = c.Id,
                    Name = c.Name,
                    Subject = c.Subject,
                    TeacherName = c.TeacherName,
                    MonthlyFee = c.MonthlyFee,
                    Day = c.Day,
                    StartTime = c.StartTime,
                    IsActive = c.IsActive
                })
                .FirstOrDefaultAsync();

            if (classItem == null)
            {
                return NotFound("Class not found.");
            }

            return Ok(classItem);
        }

        // =========================================
        // POST: api/classes
        // Create new class
        // Admin only
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateClass(
            CreateClassRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest("Class name is required.");
            }

            if (request.MonthlyFee < 0)
            {
                return BadRequest(
                    "Monthly fee cannot be negative."
                );
            }

            var classItem =
                new ClassManagement.Api.Models.Class
                {
                    Name = request.Name,
                    Subject = request.Subject,
                    TeacherName = request.TeacherName,
                    MonthlyFee = request.MonthlyFee,
                    Day = request.Day,
                    StartTime = request.StartTime,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

            _context.Classes.Add(classItem);

            await _context.SaveChangesAsync();

            return Ok(
                ToClassResponse(classItem)
            );
        }

        // =========================================
        // PUT: api/classes/{id}
        // Update class
        // Admin only
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateClass(
            int id,
            UpdateClassRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(
                    "Class name is required."
                );
            }

            if (request.MonthlyFee < 0)
            {
                return BadRequest(
                    "Monthly fee cannot be negative."
                );
            }

            var classItem =
                await _context.Classes.FindAsync(id);

            if (classItem == null)
            {
                return NotFound(
                    "Class not found."
                );
            }

            classItem.Name = request.Name;
            classItem.Subject = request.Subject;
            classItem.TeacherName =
                request.TeacherName;
            classItem.MonthlyFee =
                request.MonthlyFee;
            classItem.Day = request.Day;
            classItem.StartTime =
                request.StartTime;

            classItem.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(
                ToClassResponse(classItem)
            );
        }

        // =========================================
        // DELETE: api/classes/{id}
        // Soft delete / deactivate class
        // Admin only
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeactivateClass(
            int id)
        {
            var classItem =
                await _context.Classes.FindAsync(id);

            if (classItem == null)
            {
                return NotFound(
                    "Class not found."
                );
            }

            classItem.IsActive = false;
            classItem.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(
                ToClassResponse(classItem)
            );
        }

        // =========================================
        // PATCH: api/classes/{id}/activate
        // Reactivate class
        // Admin only
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> ActivateClass(
            int id)
        {
            var classItem =
                await _context.Classes.FindAsync(id);

            if (classItem == null)
            {
                return NotFound(
                    "Class not found."
                );
            }

            classItem.IsActive = true;
            classItem.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(
                ToClassResponse(classItem)
            );
        }

        // =========================================
// DELETE: api/classes/{id}/permanent
// Permanently delete class
// Admin only
// Deletes related:
// - Payments
// - Attendances
// - Enrollments
// =========================================
[Authorize(Roles = "Admin")]
[HttpDelete("{id}/permanent")]
public async Task<IActionResult> PermanentlyDeleteClass(int id)
{
    var classItem = await _context.Classes.FindAsync(id);

    if (classItem == null)
    {
        return NotFound("Class not found.");
    }

    await using var transaction =
        await _context.Database.BeginTransactionAsync();

    try
    {
        // Delete payments related to this class
        var payments = await _context.Payments
            .Where(p => p.ClassId == id)
            .ToListAsync();

        if (payments.Count > 0)
        {
            _context.Payments.RemoveRange(payments);
        }

        // Delete attendance records related to this class
        var attendances = await _context.Attendances
            .Where(a => a.ClassId == id)
            .ToListAsync();

        if (attendances.Count > 0)
        {
            _context.Attendances.RemoveRange(attendances);
        }

        // Delete enrollments related to this class
        var enrollments = await _context.Enrollments
            .Where(e => e.ClassId == id)
            .ToListAsync();

        if (enrollments.Count > 0)
        {
            _context.Enrollments.RemoveRange(enrollments);
        }

        // Finally delete the class
        _context.Classes.Remove(classItem);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            message = "Class permanently deleted successfully.",
            classId = id,
            className = classItem.Name
        });
    }
    catch
    {
        await transaction.RollbackAsync();

        return StatusCode(
            500,
            "Failed to permanently delete class."
        );
    }
}


        // =========================================
        // Convert Class to ClassResponse
        // =========================================
        private static ClassResponse ToClassResponse(
            ClassManagement.Api.Models.Class classItem)
        {
            return new ClassResponse
            {
                Id = classItem.Id,
                Name = classItem.Name,
                Subject = classItem.Subject,
                TeacherName = classItem.TeacherName,
                MonthlyFee = classItem.MonthlyFee,
                Day = classItem.Day,
                StartTime = classItem.StartTime,
                IsActive = classItem.IsActive
            };
        }
    }
}