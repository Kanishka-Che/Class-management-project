
using ClassManagement.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/class-daily-collections")]
    [Authorize(Roles = "Admin,Staff")]
    public class ClassDailyCollectionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClassDailyCollectionsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{classId:int}")]
        public async Task<IActionResult> GetTodayCollection(int classId)
        {
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == classId);

            if (!classExists)
                return NotFound("Class not found.");

            var sriLankaZone =
                TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");

            var today = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                sriLankaZone
            ).Date;

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(
                today,
                sriLankaZone
            );

            var endUtc = TimeZoneInfo.ConvertTimeToUtc(
                today.AddDays(1),
                sriLankaZone
            );

            var payments = _context.Payments
                .AsNoTracking()
                .Where(p =>
                    p.ClassId == classId &&
                    p.PaidAt >= startUtc &&
                    p.PaidAt < endUtc
                );

            var totalCollection = await payments
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var paymentCount = await payments.CountAsync();

            return Ok(new
            {
                classId,
                date = today.ToString("yyyy-MM-dd"),
                totalCollection,
                paymentCount
            });
        }
    }
}
