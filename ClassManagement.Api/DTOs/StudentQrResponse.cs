namespace ClassManagement.Api.DTOs
{
    public class StudentQrResponse
    {
        public int StudentId { get; set; }

        public string StudentCode { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public string QrToken { get; set; } = string.Empty;

        public string QrImageBase64 { get; set; } = string.Empty;
    }
}