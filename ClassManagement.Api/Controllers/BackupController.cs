using ClassManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class BackupController : ControllerBase
    {
        private readonly DatabaseBackupService _backupService;

        public BackupController(
            DatabaseBackupService backupService)
        {
            _backupService = backupService;
        }

        // =========================================
        // POST: api/backup
        // Create database backup manually
        // Admin only
        // =========================================
        [HttpPost]
        public async Task<IActionResult> CreateBackup()
        {
            try
            {
                var backupPath =
                    await _backupService.CreateBackupAsync();

                var fileName = Path.GetFileName(backupPath);

                return Ok(new
                {
                    message = "Database backup created successfully.",
                    fileName
                });
            }
            catch (Exception)
            {
                return StatusCode(
                    500,
                    "Database backup failed."
                );
            }
        }
    }
}