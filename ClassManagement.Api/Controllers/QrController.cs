using ClassManagement.Api.Data;
using ClassManagement.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QRCoder;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class QrController : ControllerBase
    {
        private readonly AppDbContext _context;

        public QrController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentQr(int studentId)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId);

            if (student == null)
            {
                return NotFound("Student not found.");
            }

            if (!student.IsActive)
            {
                return BadRequest("Student is inactive.");
            }

            if (string.IsNullOrWhiteSpace(student.QrToken))
            {
                return BadRequest("Student does not have a QR token.");
            }

            using var qrGenerator = new QRCodeGenerator();

            using var qrData = qrGenerator.CreateQrCode(
                student.QrToken,
                QRCodeGenerator.ECCLevel.Q
            );

            var pngQrCode = new PngByteQRCode(qrData);

            byte[] qrBytes = pngQrCode.GetGraphic(20);

            var qrBase64 = Convert.ToBase64String(qrBytes);

            var response = new StudentQrResponse
            {
                StudentId = student.Id,
                StudentCode = student.StudentCode,
                StudentName =
                    $"{student.FirstName} {student.LastName}".Trim(),
                QrToken = student.QrToken,
                QrImageBase64 =
                    $"data:image/png;base64,{qrBase64}"
            };

            return Ok(response);
        }
    }
}