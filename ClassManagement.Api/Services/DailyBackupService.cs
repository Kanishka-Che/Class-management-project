namespace ClassManagement.Api.Services
{
    public class DailyBackupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DailyBackupService> _logger;

        public DailyBackupService(
            IServiceScopeFactory scopeFactory,
            IConfiguration configuration,
            ILogger<DailyBackupService> logger)
        {
            _scopeFactory = scopeFactory;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(
            CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var backupHour =
                        _configuration.GetValue<int>("Backup:Hour");

                    var backupMinute =
                        _configuration.GetValue<int>("Backup:Minute");

                    if (backupHour < 0 || backupHour > 23)
{
    throw new InvalidOperationException(
        "Backup hour must be between 0 and 23."
    );
}

if (backupMinute < 0 || backupMinute > 59)
{
    throw new InvalidOperationException(
        "Backup minute must be between 0 and 59."
    );
}

                    var sriLankaTimeZone =
                        TimeZoneInfo.FindSystemTimeZoneById(
                            "Sri Lanka Standard Time"
                        );

                    var now =
                        TimeZoneInfo.ConvertTimeFromUtc(
                            DateTime.UtcNow,
                            sriLankaTimeZone
                        );

                    var nextBackup = new DateTime(
                        now.Year,
                        now.Month,
                        now.Day,
                        backupHour,
                        backupMinute,
                        0
                    );

                    // Today's backup time has already passed
                    if (nextBackup <= now)
                    {
                        nextBackup = nextBackup.AddDays(1);
                    }

                    var delay = nextBackup - now;

                    _logger.LogInformation(
                        "Next automatic database backup scheduled for {BackupTime}.",
                        nextBackup
                    );

                    await Task.Delay(
                        delay,
                        stoppingToken
                    );

                    using var scope =
                        _scopeFactory.CreateScope();

                    var backupService =
                        scope.ServiceProvider
                            .GetRequiredService<DatabaseBackupService>();

                    await backupService.CreateBackupAsync();

                    _logger.LogInformation(
                        "Automatic daily database backup completed."
                    );
                }
                catch (OperationCanceledException)
                    when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Automatic database backup failed."
                    );

                    // Prevent rapid retry loop if an error occurs
                    await Task.Delay(
                        TimeSpan.FromMinutes(5),
                        stoppingToken
                    );
                }
            }
        }
    }
}