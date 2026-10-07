namespace ClassManagement.Api.DTOs
{
    public class EnrollmentResponse
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;

        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;

        public int AcademicYear { get; set; }
        public DateTime JoinedDate { get; set; }
        public bool IsActive { get; set; }
    }
}