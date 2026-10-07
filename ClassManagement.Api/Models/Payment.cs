namespace ClassManagement.Api.Models
{
    public class Payment
    {
        public int Id { get; set; }

        public int StudentId { get; set; }

        public int ClassId { get; set; }

        public int Year { get; set; }

        public int Month { get; set; }

        public decimal Amount { get; set; }

        public DateTime PaidAt { get; set; } = DateTime.UtcNow;

        public Student? Student { get; set; }

        public Class? Class { get; set; }
    }
}