using ClassManagement.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .OrderBy(u => u.Username)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Role,
                    u.IsActive,
                    u.CreatedAt,
                    u.UpdatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/users/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Role,
                    u.IsActive,
                    u.CreatedAt,
                    u.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound("User not found.");
            }

            return Ok(user);
        }

        // PATCH: api/users/1/deactivate
        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> DeactivateUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound("User not found.");
            }

            var currentUserId = User.FindFirst(
    System.Security.Claims.ClaimTypes.NameIdentifier
)?.Value;

if (currentUserId == id.ToString())
{
    return BadRequest(
        "You cannot deactivate your own account."
    );
}

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "User deactivated successfully.",
                user.Id,
                user.Username,
                user.Role,
                user.IsActive
            });
        }

        // PATCH: api/users/1/activate
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> ActivateUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound("User not found.");
            }

            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "User activated successfully.",
                user.Id,
                user.Username,
                user.Role,
                user.IsActive
            });
            
        }

        // =========================================
// DELETE: api/users/{id}/permanent
// Permanently delete user account
// Admin only
// Current logged-in Admin cannot delete own account
// =========================================
[HttpDelete("{id}/permanent")]
public async Task<IActionResult> PermanentlyDeleteUser(int id)
{
    var user = await _context.Users.FindAsync(id);

    if (user == null)
    {
        return NotFound("User not found.");
    }

    var currentUserId = User.FindFirst(
        System.Security.Claims.ClaimTypes.NameIdentifier
    )?.Value;

    if (currentUserId == id.ToString())
    {
        return BadRequest(
            "You cannot permanently delete your own account."
        );
    }

    // Safer flow:
    // User must be deactivated before permanent deletion
    if (user.IsActive)
    {
        return BadRequest(
            "Deactivate the user before permanently deleting the account."
        );
    }

    _context.Users.Remove(user);

    await _context.SaveChangesAsync();

    return Ok(new
    {
        message = "User permanently deleted successfully.",
        userId = id,
        username = user.Username
    });
}

        // =========================================
        // POST: api/users/change-password
        // Change password for the currently logged-in user
        // =========================================
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(
            [FromBody] ChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Current password and new password are required.");
            }

            if (request.NewPassword.Length < 6)
            {
                return BadRequest("New password must be at least 6 characters.");
            }

            var currentUserId = User.FindFirst(
                System.Security.Claims.ClaimTypes.NameIdentifier
            )?.Value;

            if (!int.TryParse(currentUserId, out var userId))
            {
                return Unauthorized("Invalid user identity.");
            }

            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound("User not found.");
            }

            if (!user.IsActive)
            {
                return Unauthorized("User account is inactive.");
            }

            if (!BCrypt.Net.BCrypt.Verify(
                    request.CurrentPassword,
                    user.PasswordHash))
            {
                return BadRequest("Current password is incorrect.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                request.NewPassword);

            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Password changed successfully."
            });
        }

        public class ChangePasswordRequest
        {
            public string CurrentPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        // =========================================
// POST: api/users/change-username
// Change username for the currently logged-in user
// =========================================
[HttpPost("change-username")]
public async Task<IActionResult> ChangeUsername(
    [FromBody] ChangeUsernameRequest request)
{
    if (string.IsNullOrWhiteSpace(request.NewUsername) ||
        string.IsNullOrWhiteSpace(request.CurrentPassword))
    {
        return BadRequest("New username and current password are required.");
    }

    var newUsername = request.NewUsername.Trim();

    if (newUsername.Length < 3)
    {
        return BadRequest("Username must be at least 3 characters.");
    }

    var currentUserId = User.FindFirst(
        System.Security.Claims.ClaimTypes.NameIdentifier
    )?.Value;

    if (!int.TryParse(currentUserId, out var userId))
    {
        return Unauthorized("Invalid user identity.");
    }

    var user = await _context.Users.FindAsync(userId);

    if (user == null)
    {
        return NotFound("User not found.");
    }

    if (!user.IsActive)
    {
        return Unauthorized("User account is inactive.");
    }

    if (!BCrypt.Net.BCrypt.Verify(
            request.CurrentPassword,
            user.PasswordHash))
    {
        return BadRequest("Current password is incorrect.");
    }

    var usernameExists = await _context.Users
        .AnyAsync(u => u.Username == newUsername && u.Id != userId);

    if (usernameExists)
    {
        return BadRequest("Username is already taken.");
    }

    user.Username = newUsername;
    user.UpdatedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();

    return Ok(new
    {
        message = "Username changed successfully.",
        username = user.Username
    });
}

public class ChangeUsernameRequest
{
    public string NewUsername { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
}
    }
}