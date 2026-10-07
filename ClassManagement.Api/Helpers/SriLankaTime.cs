namespace ClassManagement.Api.Helpers
{
    public static class SriLankaTime
    {
        private static readonly TimeZoneInfo SriLankaTimeZone =
            TimeZoneInfo.FindSystemTimeZoneById(
                "Sri Lanka Standard Time"
            );

        public static DateTime Now()
        {
            return TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                SriLankaTimeZone
            );
        }

        public static DateOnly Today()
        {
            return DateOnly.FromDateTime(Now());
        }
    }
}