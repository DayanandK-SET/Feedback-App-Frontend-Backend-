/**
 * Shared email validation utility.
 * Mirrors the backend EmailHelper.IsValidEmail rules exactly.
 * Use this in every place that accepts an email address.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;

  const atIdx = email.indexOf('@');
  if (atIdx < 1) return false;

  const local  = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);

  // Local part: max 64 chars, no leading/trailing/consecutive dots
  if (local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;

  // Domain: must have a dot, no leading/trailing/consecutive dots, TLD >= 2 chars
  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  const tld = domain.split('.').at(-1)!;
  if (tld.length < 2) return false;

  return EMAIL_REGEX.test(email);
}

/**
 * Validates a list of raw email strings (comma/semicolon/newline separated).
 * Returns { emails: string[], error: string }
 * - emails: deduplicated, normalised list if all valid
 * - error: non-empty string if any are invalid
 */
export function parseAndValidateEmails(raw: string): { emails: string[]; error: string } {
  const list = raw
    .split(/[\n,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  if (list.length === 0) {
    return { emails: [], error: 'Please enter at least one email address.' };
  }

  const invalid = list.filter(e => !isValidEmail(e));
  if (invalid.length > 0) {
    return { emails: [], error: `Invalid email(s): ${invalid.join(', ')}` };
  }

  return { emails: [...new Set(list)], error: '' };
}
