using System.ComponentModel.DataAnnotations;

namespace ClassManagement.Api.DTOs
{
    public class QrAttendanceRequest
    {
        [Required(ErrorMessage = "QR token is required.")]
        [StringLength(
            200,
            ErrorMessage = "QR token cannot exceed 200 characters."
        )]
        public string QrToken { get; set; } = string.Empty;

        [Range(
            1,
            int.MaxValue,
            ErrorMessage = "Valid class ID is required."
        )]
        public int ClassId { get; set; }
    }
}