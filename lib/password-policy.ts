/**
 * Central password policy for sign-up. Requires a strong password and rejects
 * the most commonly-breached choices. Used at submit time in the auth forms and
 * (optionally) to drive an inline strength hint.
 *
 * Rules: >= 8 chars, at least one uppercase, one lowercase, one digit, one
 * symbol, no whitespace, and not on the common-password blocklist.
 */

// A compact set of the most common / breached passwords. Compared against the
// lowercased password. Keep this scannable; add at the bottom.
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "password12",
  "password123", "passw0rd", "p@ssw0rd", "p@ssword", "qwerty", "qwerty123",
  "qwertyuiop", "1q2w3e4r", "1qaz2wsx", "zaq12wsx", "admin", "admin123",
  "administrator", "welcome", "welcome1", "welcome123", "letmein", "iloveyou",
  "sunshine", "princess", "football", "baseball", "monkey", "dragon",
  "master", "superman", "batman", "trustno1", "abc12345", "abcd1234",
  "aa123456", "a1b2c3d4", "test1234", "changeme", "changeme123", "nomarc123",
  "nomarc1234", "asdfghjkl", "qazwsxedc", "michael1", "jordan23", "harley",
  "hunter2", "loveme1", "starwars", "whatever", "computer", "internet",
  "samsung1", "google123", "myspace1", "789456123", "159753", "112233",
  "121212", "654321", "666666", "888888", "11111111", "00000000",
]);

/** Individual rules — drive the live requirements checklist under the field. */
export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { label: "One symbol", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  { label: "No spaces", test: (pw) => pw.length > 0 && !/\s/.test(pw) },
  { label: "Not a common password", test: (pw) => !COMMON_PASSWORDS.has(pw.toLowerCase()) },
];

export interface PasswordCheck {
  ok: boolean;
  /** First failing rule message, if any. */
  error: string | null;
}

export function validatePassword(pwd: string): PasswordCheck {
  if (!pwd || pwd.length < 8)
    return { ok: false, error: "Password must be at least 8 characters." };
  if (/\s/.test(pwd))
    return { ok: false, error: "Password can't contain spaces." };
  if (!/[a-z]/.test(pwd))
    return { ok: false, error: "Password needs at least one lowercase letter." };
  if (!/[A-Z]/.test(pwd))
    return { ok: false, error: "Password needs at least one uppercase letter." };
  if (!/[0-9]/.test(pwd))
    return { ok: false, error: "Password needs at least one number." };
  if (!/[^A-Za-z0-9]/.test(pwd))
    return { ok: false, error: "Password needs at least one symbol." };
  if (COMMON_PASSWORDS.has(pwd.toLowerCase()))
    return { ok: false, error: "That password is too common — please choose a stronger one." };
  return { ok: true, error: null };
}

/** Convenience boolean. */
export const isValidPassword = (pwd: string) => validatePassword(pwd).ok;
