using ClassManagement.Api.Data;
using ClassManagement.Api.DTOs;
using ClassManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace ClassManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(
            AppDbContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // =========================================
        // POST: api/auth/register
        // =========================================
        [Authorize(Roles = "Admin")]
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
            {
                return BadRequest("Username is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Password is required.");
            }

            if (request.Password.Length < 6)
            {
                return BadRequest(
                    "Password must be at least 6 characters."
                );
            }

            if (request.Role != "Admin" &&
                request.Role != "Staff")
            {
                return BadRequest(
                    "Role must be Admin or Staff."
                );
            }

            var usernameExists = await _context.Users
                .AnyAsync(u => u.Username == request.Username);

            if (usernameExists)
            {
                return BadRequest("Username already exists.");
            }

            var user = new User
            {
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                    request.Password
                ),
                Role = request.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "User registered successfully.",
                user = new
                {
                    user.Id,
                    user.Username,
                    user.Role,
                    user.IsActive
                }
            });
        }
// =========================================
// POST: api/auth/login
// =========================================
[HttpPost("login")]
public async Task<IActionResult> Login(
    LoginRequest request)
{
    const int maxFailedAttempts = 5;
    const int lockoutMinutes = 15;

    if (string.IsNullOrWhiteSpace(request.Username))
    {
        return BadRequest("Username is required.");
    }

    if (string.IsNullOrWhiteSpace(request.Password))
    {
        return BadRequest("Password is required.");
    }

    var user = await _context.Users
        .FirstOrDefaultAsync(u =>
            u.Username == request.Username);

    if (user == null)
    {
        return Unauthorized(
            "Invalid username or password."
        );
    }

    if (!user.IsActive)
    {
        return Unauthorized(
            "User account is inactive."
        );
    }

    // Check whether the account is currently locked
    if (user.LockoutEnd.HasValue)
    {
        if (user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remainingMinutes = Math.Max(
                1,
                (int)Math.Ceiling(
                    (user.LockoutEnd.Value - DateTime.UtcNow)
                    .TotalMinutes
                )
            );

            return Unauthorized(
                $"Account temporarily locked. Try again in {remainingMinutes} minute(s)."
            );
        }

        // Lockout period has expired
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        await _context.SaveChangesAsync();
    }

    var passwordValid = BCrypt.Net.BCrypt.Verify(
        request.Password,
        user.PasswordHash
    );

    if (!passwordValid)
    {
        user.FailedLoginAttempts++;

        if (user.FailedLoginAttempts >= maxFailedAttempts)
        {
            user.LockoutEnd = DateTime.UtcNow
                .AddMinutes(lockoutMinutes);

            user.FailedLoginAttempts = 0;

            await _context.SaveChangesAsync();

            return Unauthorized(
                "Too many failed login attempts. Your account has been temporarily locked for 15 minutes."
            );
        }

        await _context.SaveChangesAsync();

        return Unauthorized(
            "Invalid username or password."
        );
    }

    // Successful login - reset failed login tracking
    user.FailedLoginAttempts = 0;
    user.LockoutEnd = null;

    await _context.SaveChangesAsync();

    var expireMinutes =
        _configuration.GetValue<int>(
            "Jwt:ExpireMinutes"
        );

    var expiresAt = DateTime.UtcNow
        .AddMinutes(expireMinutes);

    var token = GenerateJwtToken(
        user,
        expiresAt
    );

    return Ok(new
    {
        message = "Login successful.",
        token,
        expiresAt,
        user = new
        {
            user.Id,
            user.Username,
            user.Role,
            user.IsActive
        }
    });
}

        // =========================================
        // Generate JWT Token
        // =========================================
        private string GenerateJwtToken(
            User user,
            DateTime expiresAt)
        {
            var jwtKey = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException(
                    "JWT Key is missing."
                );

            var jwtIssuer = _configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException(
                    "JWT Issuer is missing."
                );

            var jwtAudience = _configuration["Jwt:Audience"]
                ?? throw new InvalidOperationException(
                    "JWT Audience is missing."
                );

            var claims = new List<Claim>
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    user.Id.ToString()
                ),

                new Claim(
                    ClaimTypes.Name,
                    user.Username
                ),

                new Claim(
                    ClaimTypes.Role,
                    user.Role
                )
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            );

            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: expiresAt,
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler()
                .WriteToken(token);
        }
    }
}