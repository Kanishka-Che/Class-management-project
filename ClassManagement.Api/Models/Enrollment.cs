namespace ClassManagement.Api.Models
{
    public class Enrollment
    {
        public int Id { get; set; }

        public int StudentId { get; set; }

        public int ClassId { get; set; }

        public int AcademicYear { get; set; }

        public DateTime JoinedDate { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;

        public Student? Student { get; set; }

        public Class? Class { get; set; }
    }
}