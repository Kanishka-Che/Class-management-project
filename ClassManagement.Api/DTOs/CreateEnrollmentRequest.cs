using System.ComponentModel.DataAnnotations;

namespace ClassManagement.Api.DTOs
{
    public class CreateEnrollmentRequest
    {
        [Range(
            1,
            int.MaxValue,
            ErrorMessage = "Valid student ID is required."
        )]
        public int StudentId { get; set; }

        [Range(
            1,
            int.MaxValue,
            ErrorMessage = "Valid class ID is required."
        )]
        public int ClassId { get; set; }

        [Range(
            2000,
            2100,
            ErrorMessage = "Academic year must be between 2000 and 2100."
        )]
        public int AcademicYear { get; set; }
    }
}