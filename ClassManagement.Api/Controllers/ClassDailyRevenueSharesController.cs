
using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/class-daily-revenue-shares")]
    [Authorize(Roles = "Admin,Staff")]
    public class ClassDailyRevenueSharesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClassDailyRevenueSharesController(AppDbContext context)
        {
            _context = context;
        }

        public class UpdateRevenueShareRequest
        {
            public decimal ClassPercentage { get; set; }
        }

        private static DateTime GetSriLankaToday()
        {
            var sriLankaNow = DateTime.UtcNow.AddMinutes(330);

            // Store the Sri Lanka calendar date as UTC midnight.
            // PostgreSQL column is timestamp with time zone.
            return new DateTime(
                sriLankaNow.Year,
                sriLankaNow.Month,
                sriLankaNow.Day,
                0, 0, 0,
                DateTimeKind.Utc
            );
        }

        // GET: api/class-daily-revenue-shares/1
        [HttpGet("{classId:int}")]
        public async Task<IActionResult> GetToday(int classId)
        {
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == classId);

            if (!classExists)
                return NotFound(new { message = "Class not found." });

            var today = GetSriLankaToday();

            var record = await _context.ClassDailyRevenueShares
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.ClassId == classId &&
                    x.Date == today
                );

            return Ok(new
            {
                classId,
                date = today.ToString("yyyy-MM-dd"),
                classPercentage = record?.ClassPercentage ?? 20m,
                teacherPercentage = record?.TeacherPercentage ?? 80m,
                isSaved = record != null,
                updatedBy = record?.UpdatedBy,
                updatedAt = record?.UpdatedAt
            });
        }

        // PUT: api/class-daily-revenue-shares/1
        [HttpPut("{classId:int}")]
        public async Task<IActionResult> SaveToday(
            int classId,
            [FromBody] UpdateRevenueShareRequest request)
        {
            if (request.ClassPercentage < 0 ||
                request.ClassPercentage > 100 ||
                decimal.Round(request.ClassPercentage, 2)
                    != request.ClassPercentage)
            {
                return BadRequest(new
                {
                    message =
                        "Class percentage must be between 0 and 100 with at most 2 decimal places."
                });
            }

            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == classId);

            if (!classExists)
                return NotFound(new { message = "Class not found." });

            var today = GetSriLankaToday();

            var teacherPercentage =
                100m - request.ClassPercentage;

            var username =
                User.Identity?.Name
                ?? User.FindFirst("username")?.Value
                ?? User.FindFirst("sub")?.Value
                ?? "Unknown";

            var record = await _context.ClassDailyRevenueShares
                .FirstOrDefaultAsync(x =>
                    x.ClassId == classId &&
                    x.Date == today
                );

            var now = DateTime.UtcNow;

            if (record == null)
            {
                record = new ClassDailyRevenueShare
                {
                    ClassId = classId,
                    Date = today,
                    ClassPercentage = request.ClassPercentage,
                    TeacherPercentage = teacherPercentage,
                    CreatedAt = now,
                    UpdatedAt = now,
                    UpdatedBy = username
                };

                _context.ClassDailyRevenueShares.Add(record);
            }
            else
            {
                record.ClassPercentage = request.ClassPercentage;
                record.TeacherPercentage = teacherPercentage;
                record.UpdatedAt = now;
                record.UpdatedBy = username;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Daily revenue share saved successfully.",
                classId,
                date = today.ToString("yyyy-MM-dd"),
                classPercentage = record.ClassPercentage,
                teacherPercentage = record.TeacherPercentage,
                updatedBy = record.UpdatedBy,
                updatedAt = record.UpdatedAt
            });
        }
    }
}
