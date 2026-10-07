
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
    }
}
