using System.Net.Http.Json;

namespace ClassManagement.Api.Services
{
    public class SmsService : ISmsService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmsService> _logger;

        public SmsService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<SmsService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        
        private static string FormatPhoneNumber(string phoneNumber)
{
    var number = phoneNumber
        .Replace(" ", "")
        .Replace("-", "")
        .Replace("+", "");

    // 0771234567 -> 94771234567
    if (number.StartsWith("0"))
    {
        number = "94" + number[1..];
    }

    return $"tel:{number}";
}
        public async Task<bool> SendSmsAsync(
            string phoneNumber,
            string message)
        {
            try
            {
                var smsEnabled =
    _configuration.GetValue<bool>("Sms:Enabled");

if (!smsEnabled)
{
    _logger.LogInformation(
        "SMS sending is currently disabled."
    );

    return false;
}


                var apiUrl = _configuration["Sms:ApiUrl"];
                var appId = _configuration["Sms:AppId"];
                var password = _configuration["Sms:Password"];

                if (string.IsNullOrWhiteSpace(apiUrl) ||
                    string.IsNullOrWhiteSpace(appId) ||
                    string.IsNullOrWhiteSpace(password))
                {
                    _logger.LogWarning(
                        "SMS configuration is missing."
                    );

                    return false;
                }

                var request = new
                {
                    applicationId = appId,
                    password = password,
                    message = message,
                   destinationAddresses = new[]
{
    FormatPhoneNumber(phoneNumber)
}
                };

var response = await _httpClient.PostAsJsonAsync(
    apiUrl,
    request
);

if (!response.IsSuccessStatusCode)
{
    _logger.LogWarning(
        "SMS sending failed. HTTP Status: {StatusCode}",
        response.StatusCode
    );

    return false;
}

var smsResponse =
    await response.Content.ReadFromJsonAsync<SmsResponse>();

if (smsResponse == null)
{
    _logger.LogWarning(
        "SMS provider returned an empty response."
    );

    return false;
}

if (smsResponse.StatusCode != "S1000")
{
    _logger.LogWarning(
        "SMS sending failed. Provider Status: {StatusCode}, Detail: {StatusDetail}",
        smsResponse.StatusCode,
        smsResponse.StatusDetail
    );

    return false;
}

_logger.LogInformation(
    "SMS sent successfully."
);

return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error occurred while sending SMS."
                );

                return false;
            }
        }
    }
}