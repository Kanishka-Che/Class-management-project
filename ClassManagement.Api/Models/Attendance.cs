namespace ClassManagement.Api.Models
{
    public class Attendance
    {
        public int Id { get; set; }

        public int StudentId { get; set; }

        public int ClassId { get; set; }

        public DateOnly AttendanceDate { get; set; }

        public DateTime CheckInTime { get; set; } = DateTime.UtcNow;

        public Student? Student { get; set; }

        public Class? Class { get; set; }
    }
}