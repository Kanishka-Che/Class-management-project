using ClassManagement.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ClassManagement.Api.Services;
using ClassManagement.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// =========================================
// Database - PostgreSQL
// =========================================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
});
// =========================================
// Controllers
// =========================================
builder.Services.AddControllers();

// =========================================
// CORS
// =========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins(
    "http://localhost:3000"
)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// =========================================
// OpenAPI
// =========================================
builder.Services.AddOpenApi();

// =========================================
// JWT Authentication
// =========================================
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is missing.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "JWT Key must be at least 32 bytes long."
    );
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("JWT Issuer is missing.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("JWT Audience is missing.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey)
                    ),

                ClockSkew = TimeSpan.Zero
            };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<DatabaseBackupService>();
builder.Services.AddScoped<InitialAdminService>();
builder.Services.AddHostedService<DailyBackupService>();
builder.Services.AddHttpClient<ISmsService, SmsService>();

var app = builder.Build();

// =========================================
// Database Migration + Initial Admin
// =========================================
using (var scope = app.Services.CreateScope())
{
    var dbContext =
        scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Apply any pending EF Core migrations automatically.
    await dbContext.Database.MigrateAsync();

    var initialAdminService =
        scope.ServiceProvider.GetRequiredService<InitialAdminService>();

    // Creates the first Admin only when Users table is empty
    // and InitialAdmin credentials are configured.
   var initialAdminCreated =
    await initialAdminService.CreateInitialAdminAsync();

if (initialAdminCreated)
{
    Console.WriteLine(
        "INITIAL_ADMIN_CREATED_SUCCESSFULLY"
    );
}
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

// =========================================
// HTTP Pipeline
// =========================================
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");

// Authentication MUST come before Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// =========================================
// Health Check
// =========================================
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy"
}));

app.MapGet("/health/setup", async (AppDbContext dbContext) =>
{
    try
    {
        var adminExists = await dbContext.Users
            .AnyAsync(u => u.Role == "Admin" && u.IsActive);

        return Results.Ok(new
        {
            status = adminExists ? "Ready" : "NotReady",
            databaseReady = true,
            adminExists
        });
    }
    catch
    {
        return Results.Ok(new
        {
            status = "NotReady",
            databaseReady = false,
            adminExists = false
        });
    }
});

app.Run();