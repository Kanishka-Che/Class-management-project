
using System.ComponentModel.DataAnnotations;

namespace ClassManagement.Api.Models
{
    public class ClassDailyRevenueShare
    {
        public int Id { get; set; }

        public int ClassId { get; set; }

        public DateTime Date { get; set; }

        [Range(0, 100)]
        public decimal ClassPercentage { get; set; } = 20m;

        [Range(0, 100)]
        public decimal TeacherPercentage { get; set; } = 80m;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? UpdatedBy { get; set; }
    }
}
