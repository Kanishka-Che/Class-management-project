
using System.ComponentModel.DataAnnotations;

namespace ClassManagement.Api.DTOs
{
    public class CreateAttendanceRequest
    {
        [Range(1, int.MaxValue,
            ErrorMessage = "Valid student ID is required.")]
        public int StudentId { get; set; }

        [Range(1, int.MaxValue,
            ErrorMessage = "Valid class ID is required.")]
        public int ClassId { get; set; }

        [Required]
        [RegularExpression(
            "^(Regular|Extra)$",
            ErrorMessage = "Session type must be Regular or Extra."
        )]
        public string SessionType { get; set; } = "Regular";
    }
}
