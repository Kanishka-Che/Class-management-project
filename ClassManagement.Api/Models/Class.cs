namespace ClassManagement.Api.Models
{
    public class Class
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Subject { get; set; }

        public string? TeacherName { get; set; }

        public decimal MonthlyFee { get; set; }

        public string? Day { get; set; }

        public TimeOnly? StartTime { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}