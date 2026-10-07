using ClassManagement.Api.Data;
using ClassManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassManagement.Api.Services
{
    public class InitialAdminService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public InitialAdminService(
            AppDbContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<bool> CreateInitialAdminAsync()
        {
            // If a user already exists, bootstrap is not required.
            if (await _context.Users.AnyAsync())
            {
                return false;
            }

            var username =
                _configuration["InitialAdmin:Username"];

            var password =
                _configuration["InitialAdmin:Password"];

            // Bootstrap credentials are required only
            // when the Users table is empty.
            if (string.IsNullOrWhiteSpace(username) ||
                string.IsNullOrWhiteSpace(password))
            {
                return false;
            }

            if (password.Length < 8)
            {
                throw new InvalidOperationException(
                    "Initial Admin password must be at least 8 characters long."
                );
            }

            var admin = new User
            {
                Username = username.Trim(),
                PasswordHash =
                    BCrypt.Net.BCrypt.HashPassword(password),
                Role = "Admin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(admin);
            await _context.SaveChangesAsync();

            // Confirm the initial Admin was created.
            return true;
        }
    }
}