
using ClassManagement.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Services
{
    public class ClassFeeService
    {
        private readonly AppDbContext _context;

        public ClassFeeService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<decimal?> GetMonthlyFeeAsync(
            int classId,
            int year,
            int month)
        {
            if (year < 2000 || year > 2100 ||
                month < 1 || month > 12)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(month),
                    "Invalid fee year or month.");
            }

            // Find the most recent fee effective on
            // or before the requested month.
            var fee = await _context.ClassMonthlyFees
                .AsNoTracking()
                .Where(f =>
                    f.ClassId == classId &&
                    (
                        f.EffectiveYear < year ||
                        (f.EffectiveYear == year &&
                         f.EffectiveMonth <= month)
                    ))
                .OrderByDescending(f => f.EffectiveYear)
                .ThenByDescending(f => f.EffectiveMonth)
                .Select(f => (decimal?)f.Amount)
                .FirstOrDefaultAsync();

            // Null means historical fee is not configured.
            return fee;
        }
    }
}
