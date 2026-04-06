namespace Feedback_Generation_App.Helpers
{
    /// <summary>
    /// Shared email utility methods used across services.
    /// </summary>
    public static class EmailHelper
    {
        /// <summary>
        /// Validates an email address thoroughly:
        /// - RFC 5321 max length (254 chars total, 64 for local part)
        /// - Uses .NET MailAddress for structural validation
        /// - Local part: no leading/trailing/consecutive dots
        /// - Domain: must contain a dot, TLD at least 2 chars, no leading/trailing/consecutive dots
        /// </summary>
        public static bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email) || email.Length > 254)
                return false;

            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                if (addr.Address != email) return false;
            }
            catch
            {
                return false;
            }

            var atIndex   = email.IndexOf('@');
            var localPart = email[..atIndex];
            var domain    = email[(atIndex + 1)..];

            if (localPart.Length == 0 || localPart.Length > 64) return false;
            if (localPart.StartsWith('.') || localPart.EndsWith('.') || localPart.Contains("..")) return false;

            if (!domain.Contains('.')) return false;
            if (domain.StartsWith('.') || domain.EndsWith('.') || domain.Contains("..")) return false;

            var tld = domain[(domain.LastIndexOf('.') + 1)..];
            if (tld.Length < 2) return false;

            return true;
        }
    }
}
