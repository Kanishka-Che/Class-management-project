namespace ClassManagement.Api.Models
{
    public class ClassMonthlyFee
    {
        public int Id { get; set; }

        public int ClassId { get; set; }

        public int EffectiveYear { get; set; }

        public int EffectiveMonth { get; set; }

        public decimal Amount { get; set; }

        public DateTime CreatedAt { get; set; }
            = DateTime.UtcNow;

        public Class? Class { get; set; }
    }
}