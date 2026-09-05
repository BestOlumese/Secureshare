/**
 * Master-password strength rules.
 *
 * This is enforced client-side only, and that is not a gap: the password never
 * leaves the browser. It is fed to PBKDF2 to unwrap the private key, so the
 * server has nothing to validate. The password's own entropy is the whole of
 * the defence against someone who obtains the encrypted key blob and guesses
 * offline.
 */

export const MIN_MASTER_PASSWORD_LENGTH = 12;

/**
 * A password long enough to pass the length check but still trivially guessed.
 * Not exhaustive — it catches the handful that show up constantly.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234",
  "passw0rd123", "123456789012", "1234567890", "qwertyuiop", "qwerty123456",
  "letmein12345", "iloveyou1234", "welcome12345", "admin1234567",
  "administrator", "changeme1234", "trustno1234", "monkey123456",
  "footballfan1", "baseball1234", "dragonfly123", "superman1234",
  "abc123456789", "111111111111", "000000000000", "secureshare1",
]);

export interface PasswordAssessment {
  /** 0 (unusable) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** What the user should change, most important first. */
  hints: string[];
  /** Whether it clears the bar for protecting a private key. */
  acceptable: boolean;
}

function hasSequentialRun(password: string): boolean {
  const lower = password.toLowerCase();
  for (let i = 0; i + 3 < lower.length + 1; i++) {
    const slice = lower.slice(i, i + 4);
    if (slice.length < 4) break;
    let ascending = true;
    let descending = true;
    for (let j = 1; j < slice.length; j++) {
      const delta = slice.charCodeAt(j) - slice.charCodeAt(j - 1);
      if (delta !== 1) ascending = false;
      if (delta !== -1) descending = false;
    }
    if (ascending || descending) return true;
  }
  return false;
}

export function assessPassword(password: string): PasswordAssessment {
  const hints: string[] = [];

  if (!password) {
    return { score: 0, label: "Enter a password", hints: [], acceptable: false };
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password)
  ).length;

  const tooShort = password.length < MIN_MASTER_PASSWORD_LENGTH;
  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase());
  const allOneChar = /^(.)\1+$/.test(password);
  const sequential = hasSequentialRun(password);

  if (tooShort) {
    hints.push(`Use at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`);
  }
  if (classes < 3) {
    hints.push("Mix upper case, lower case, numbers and symbols.");
  }
  if (isCommon) hints.push("This is a commonly used password.");
  if (allOneChar) hints.push("Avoid repeating a single character.");
  if (sequential) hints.push("Avoid runs like 1234 or abcd.");

  // Disqualifying regardless of length or variety.
  if (isCommon || allOneChar) {
    return { score: 0, label: "Unusable", hints, acceptable: false };
  }
  if (tooShort) {
    return { score: 1, label: "Too short", hints, acceptable: false };
  }

  let score = 1;
  if (password.length >= MIN_MASTER_PASSWORD_LENGTH) score++;
  if (password.length >= 16) score++;
  if (classes >= 3) score++;
  if (classes === 4 && password.length >= 20) score++;
  if (sequential) score--;

  const clamped = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
  const labels: Record<1 | 2 | 3 | 4, string> = {
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  // Length and variety are the bar; passphrases clear it without symbols.
  const acceptable = !tooShort && classes >= 3 && clamped >= 2;
  if (!acceptable && hints.length === 0) {
    hints.push("Add more length or a wider mix of characters.");
  }

  return { score: clamped, label: labels[clamped], hints, acceptable };
}
