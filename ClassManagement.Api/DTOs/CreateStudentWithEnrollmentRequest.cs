namespace ClassManagement.Api.DTOs
{
    public class CreateStudentWithEnrollmentRequest
    {
        // Student Information
        public string FirstName { get; set; } = string.Empty;

        public string? LastName { get; set; }

        public DateOnly? DateOfBirth { get; set; }

        public string? Gender { get; set; }

        public string? Phone { get; set; }

        public string? ParentName { get; set; }

        public string? ParentPhone { get; set; }

        public string? Address { get; set; }

        public string? School { get; set; }

        // Enrollment Information
        public int ClassId { get; set; }

        public int AcademicYear { get; set; }
    }
}