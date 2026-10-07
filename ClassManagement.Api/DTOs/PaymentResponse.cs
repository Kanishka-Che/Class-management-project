namespace ClassManagement.Api.DTOs
{
    public class PaymentResponse
    {
        public int Id { get; set; }

        public int StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;

        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;

        public int Year { get; set; }
        public int Month { get; set; }
        public decimal Amount { get; set; }

        public DateTime PaidAt { get; set; }
    }
}