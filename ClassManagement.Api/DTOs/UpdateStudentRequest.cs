using System.ComponentModel.DataAnnotations;

namespace ClassManagement.Api.DTOs
{
    public class UpdateStudentRequest
    {
        [Required(ErrorMessage = "First name is required.")]
        [StringLength(100, MinimumLength = 2)]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? LastName { get; set; }

        public DateOnly? DateOfBirth { get; set; }

        [StringLength(20)]
        public string? Gender { get; set; }

        [RegularExpression(
            @"^[0-9]{10}$",
            ErrorMessage = "Phone number must contain exactly 10 digits."
        )]
        public string? Phone { get; set; }

        [StringLength(150)]
        public string? ParentName { get; set; }

        [RegularExpression(
            @"^[0-9]{10}$",
            ErrorMessage = "Parent phone number must contain exactly 10 digits."
        )]
        public string? ParentPhone { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }

        [StringLength(200)]
        public string? School { get; set; }
    }
}