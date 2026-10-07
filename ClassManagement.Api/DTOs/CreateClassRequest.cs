using System.ComponentModel.DataAnnotations;

namespace ClassManagement.Api.DTOs
{
    public class CreateClassRequest
    {
        [Required(ErrorMessage = "Class name is required.")]
        [StringLength(100, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Subject { get; set; }

        [StringLength(150)]
        public string? TeacherName { get; set; }

        [Range(
            0,
            1000000,
            ErrorMessage = "Monthly fee must be between 0 and 1,000,000."
        )]
        public decimal MonthlyFee { get; set; }

        [StringLength(20)]
        public string? Day { get; set; }

        public TimeOnly? StartTime { get; set; }
    }
}