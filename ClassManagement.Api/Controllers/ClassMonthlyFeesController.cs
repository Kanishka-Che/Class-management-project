
using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using ClassManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/class-monthly-fees")]
    [Authorize(Roles = "Admin")]
    public class ClassMonthlyFeesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ClassFeeService _feeService;

        public ClassMonthlyFeesController(
            AppDbContext context,
            ClassFeeService feeService)
        {
            _context = context;
            _feeService = feeService;
        }

        public class SetMonthlyFeeRequest
        {
            public int ClassId { get; set; }
            public int EffectiveYear { get; set; }
            public int EffectiveMonth { get; set; }
            public decimal Amount { get; set; }
        }

        public class UpdateMonthlyFeeRequest
{
    public decimal Amount { get; set; }
}

        [HttpGet("{classId:int}")]
        public async Task<IActionResult> GetFeeHistory(int classId)
        {
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == classId);

            if (!classExists)
                return NotFound("Class not found.");

            var history = await _context.ClassMonthlyFees
                .AsNoTracking()
                .Where(f => f.ClassId == classId)
                .OrderBy(f => f.EffectiveYear)
                .ThenBy(f => f.EffectiveMonth)
                .Select(f => new
                {
                    f.Id,
                    f.ClassId,
                    f.EffectiveYear,
                    f.EffectiveMonth,
                    f.Amount,
                    f.CreatedAt
                })
                .ToListAsync();

            return Ok(history);
        }

        [HttpGet("{classId:int}/fee")]
        public async Task<IActionResult> GetFee(
            int classId,
            [FromQuery] int year,
            [FromQuery] int month)
        {
            if (year < 2000 || year > 2100 ||
                month < 1 || month > 12)
                return BadRequest("Invalid year or month.");

            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == classId);

            if (!classExists)
                return NotFound("Class not found.");

            var amount = await _feeService.GetMonthlyFeeAsync(
                classId, year, month);

            if (amount == null)
                return NotFound(
                    "Historical fee is not configured for this month.");

            return Ok(new { classId, year, month, amount });
        }

        [HttpPost]
        public async Task<IActionResult> SetMonthlyFee(
            [FromBody] SetMonthlyFeeRequest request)
        {
            if (request.EffectiveYear < 2000 ||
                request.EffectiveYear > 2100 ||
                request.EffectiveMonth < 1 ||
                request.EffectiveMonth > 12 ||
                request.Amount < 0)
            {
                return BadRequest("Invalid fee details.");
            }

            if (IsPastMonth(request.EffectiveYear, request.EffectiveMonth))
{
    return Conflict(
        "Cannot add or change fees for past months."
    );
}

            var classItem = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == request.ClassId);

            if (classItem == null)
                return NotFound("Class not found.");

            var existing = await _context.ClassMonthlyFees
                .FirstOrDefaultAsync(f =>
                    f.ClassId == request.ClassId &&
                    f.EffectiveYear == request.EffectiveYear &&
                    f.EffectiveMonth == request.EffectiveMonth);

            if (existing != null)
                return Conflict(
                    "A fee change already exists for this effective month.");

            
 // Find the next scheduled fee change
 var nextChange = await _context.ClassMonthlyFees
     .AsNoTracking()
     .Where(f =>
         f.ClassId == request.ClassId &&
         (
             f.EffectiveYear > request.EffectiveYear ||
             (f.EffectiveYear == request.EffectiveYear &&
              f.EffectiveMonth > request.EffectiveMonth)
         ))
     .OrderBy(f => f.EffectiveYear)
     .ThenBy(f => f.EffectiveMonth)
     .FirstOrDefaultAsync();

 // Check payments in the period affected
 // by this new fee change.
 var hasAffectedPayments = await _context.Payments
     .AnyAsync(p =>
         p.ClassId == request.ClassId &&
         (
             p.Year > request.EffectiveYear ||
             (p.Year == request.EffectiveYear &&
              p.Month >= request.EffectiveMonth)
         ) &&
         (
             nextChange == null ||
             p.Year < nextChange.EffectiveYear ||
             (p.Year == nextChange.EffectiveYear &&
              p.Month < nextChange.EffectiveMonth)
         ));

 if (hasAffectedPayments)
 {
     return Conflict(
         "Cannot change the fee for a period " +
         "that already contains recorded payments."
     );
 }


            var fee = new ClassMonthlyFee
            {
                ClassId = request.ClassId,
                EffectiveYear = request.EffectiveYear,
                EffectiveMonth = request.EffectiveMonth,
                Amount = request.Amount
            };

           
_context.ClassMonthlyFees.Add(fee);

// Save the new historical fee record
await _context.SaveChangesAsync();

// Find the latest effective fee as of the
// current Sri Lanka month.
var sriLankaZone =
    TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");

var now = TimeZoneInfo.ConvertTimeFromUtc(
    DateTime.UtcNow,
    sriLankaZone
);

var currentFee = await _feeService.GetMonthlyFeeAsync(
    request.ClassId,
    now.Year,
    now.Month
);

// Update Classes.MonthlyFee only when a
// fee is effective for the current month.
if (currentFee.HasValue)
{
    classItem.MonthlyFee = currentFee.Value;
    classItem.UpdatedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();
}


            return Ok(new
            {
                message = "Historical monthly fee saved successfully.",
                fee.Id,
                fee.ClassId,
                fee.EffectiveYear,
                fee.EffectiveMonth,
                fee.Amount
            });
        }

        
[HttpDelete("{feeId:int}")]
public async Task<IActionResult> DeleteMonthlyFee(int feeId)
{
    var fee = await _context.ClassMonthlyFees
        .FirstOrDefaultAsync(f => f.Id == feeId);

    if (fee == null)
        return NotFound("Fee history record not found.");

    if (IsPastMonth(fee.EffectiveYear, fee.EffectiveMonth))
{
    return Conflict(
        "Cannot delete fee changes from past months."
    );
}

    var classItem = await _context.Classes
        .FirstOrDefaultAsync(c => c.Id == fee.ClassId);

    if (classItem == null)
        return NotFound("Class not found.");

    // Prevent deleting the earliest fee record.
    var hasEarlierFee = await _context.ClassMonthlyFees
        .AnyAsync(f =>
            f.ClassId == fee.ClassId &&
            (
                f.EffectiveYear < fee.EffectiveYear ||
                (f.EffectiveYear == fee.EffectiveYear &&
                 f.EffectiveMonth < fee.EffectiveMonth)
            ));

    if (!hasEarlierFee)
    {
        return Conflict(
            "Cannot delete the earliest fee record. " +
            "A class must retain its initial fee."
        );
    }

    // Find the next fee change.
    var nextChange = await _context.ClassMonthlyFees
        .AsNoTracking()
        .Where(f =>
            f.ClassId == fee.ClassId &&
            (
                f.EffectiveYear > fee.EffectiveYear ||
                (f.EffectiveYear == fee.EffectiveYear &&
                 f.EffectiveMonth > fee.EffectiveMonth)
            ))
        .OrderBy(f => f.EffectiveYear)
        .ThenBy(f => f.EffectiveMonth)
        .FirstOrDefaultAsync();

    // Check payments affected by deleting this fee.
    var hasAffectedPayments = await _context.Payments
        .AnyAsync(p =>
            p.ClassId == fee.ClassId &&
            (
                p.Year > fee.EffectiveYear ||
                (p.Year == fee.EffectiveYear &&
                 p.Month >= fee.EffectiveMonth)
            ) &&
            (
                nextChange == null ||
                p.Year < nextChange.EffectiveYear ||
                (p.Year == nextChange.EffectiveYear &&
                 p.Month < nextChange.EffectiveMonth)
            ));

    if (hasAffectedPayments)
    {
        return Conflict(
            "Cannot delete this fee change because " +
            "payments already exist in the affected period."
        );
    }

    await using var transaction =
        await _context.Database.BeginTransactionAsync();

    _context.ClassMonthlyFees.Remove(fee);
    await _context.SaveChangesAsync();

    // Recalculate the fee effective today in Sri Lanka.
    var sriLankaZone =
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");

    var now = TimeZoneInfo.ConvertTimeFromUtc(
        DateTime.UtcNow,
        sriLankaZone
    );

    var currentFee = await _feeService.GetMonthlyFeeAsync(
        fee.ClassId,
        now.Year,
        now.Month
    );

    if (currentFee.HasValue)
    {
        classItem.MonthlyFee = currentFee.Value;
        classItem.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    await transaction.CommitAsync();

    return Ok(new
    {
        message = "Fee change deleted successfully.",
        deletedFeeId = feeId
    });
}


private static bool IsPastMonth(int year, int month)
{
    var sriLankaZone =
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");

    var now = TimeZoneInfo.ConvertTimeFromUtc(
        DateTime.UtcNow,
        sriLankaZone
    );

    return year < now.Year ||
           (year == now.Year && month < now.Month);
}


    }
}
