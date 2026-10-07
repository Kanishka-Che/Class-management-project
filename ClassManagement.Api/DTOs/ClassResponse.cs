namespace ClassManagement.Api.DTOs
{
    public class ClassResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Subject { get; set; }
        public string? TeacherName { get; set; }
        public decimal MonthlyFee { get; set; }
        public string? Day { get; set; }
        public TimeOnly? StartTime { get; set; }
        public bool IsActive { get; set; }
    }
}