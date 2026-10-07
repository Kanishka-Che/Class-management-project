namespace ClassManagement.Api.Models
{
    public class Student
    {
        public int Id { get; set; }

        public string StudentCode { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string? LastName { get; set; }

        public DateOnly? DateOfBirth { get; set; }

        public string? Gender { get; set; }

        public string? Phone { get; set; }

        public string? ParentName { get; set; }

        public string? ParentPhone { get; set; }

        public string? Address { get; set; }

        public string? School { get; set; }

        public string QrToken { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}