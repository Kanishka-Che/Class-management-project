using System.Diagnostics;

namespace ClassManagement.Api.Services
{
    public class DatabaseBackupService
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<DatabaseBackupService> _logger;

        public DatabaseBackupService(
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<DatabaseBackupService> logger)
        {
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
        }

        public async Task<string> CreateBackupAsync()
        {
            var backupFolder = Path.Combine(
                _environment.ContentRootPath,
                "Backups"
            );

            Directory.CreateDirectory(backupFolder);

            var fileName =
                $"class_management_db_{DateTime.Now:yyyyMMdd_HHmmss}.backup";

            var backupPath = Path.Combine(
                backupFolder,
                fileName
            );

            var connectionString =
                _configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException(
                    "Database connection string is missing."
                );

            var builder =
                new Npgsql.NpgsqlConnectionStringBuilder(
                    connectionString
                );

           var pgDumpPath =
    _configuration["Backup:PgDumpPath"];

if (string.IsNullOrWhiteSpace(pgDumpPath))
{
    throw new InvalidOperationException(
        "PostgreSQL pg_dump path is missing."
    );
}

if (!File.Exists(pgDumpPath))
{
    throw new FileNotFoundException(
        "PostgreSQL pg_dump.exe was not found.",
        pgDumpPath
    );
}

var startInfo = new ProcessStartInfo
{
    FileName = pgDumpPath,
    UseShellExecute = false,
    RedirectStandardError = true,
    RedirectStandardOutput = true,
    CreateNoWindow = true
};

            startInfo.ArgumentList.Add("-h");
            startInfo.ArgumentList.Add(
    builder.Host ?? "localhost"
);

            startInfo.ArgumentList.Add("-p");
            startInfo.ArgumentList.Add(
                builder.Port.ToString()
            );

            startInfo.ArgumentList.Add("-U");
            startInfo.ArgumentList.Add(
    builder.Username ?? "postgres"
);


            startInfo.ArgumentList.Add("-d");
            startInfo.ArgumentList.Add(
    builder.Database ??
    throw new InvalidOperationException(
        "Database name is missing."
    )
);

            startInfo.ArgumentList.Add("-F");
            startInfo.ArgumentList.Add("c");

            startInfo.ArgumentList.Add("-f");
            startInfo.ArgumentList.Add(backupPath);

            startInfo.Environment["PGPASSWORD"] =
                builder.Password;

            using var process = new Process
            {
                StartInfo = startInfo
            };

            process.Start();

            var error = await process.StandardError
                .ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError(
                    "Database backup failed: {Error}",
                    error
                );

                throw new Exception(
                    $"Database backup failed: {error}"
                );
            }

            _logger.LogInformation(
    "Database backup created: {BackupPath}",
    backupPath
);

// Delete backup files older than 30 days
var oldBackupFiles = Directory.GetFiles(
    backupFolder,
    "*.backup"
);

foreach (var file in oldBackupFiles)
{
    var fileInfo = new FileInfo(file);

    if (fileInfo.CreationTime < DateTime.Now.AddDays(-30))
    {
        fileInfo.Delete();

        _logger.LogInformation(
            "Old backup deleted: {FileName}",
            fileInfo.Name
        );
    }
}

return backupPath;
        }
    }
}