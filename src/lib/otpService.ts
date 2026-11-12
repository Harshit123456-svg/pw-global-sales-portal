import crypto from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'pw_global_secure_parent_otp_secret_key_2026';
const MAX_ATTEMPTS = 5;

/**
 * Generates a random 4-digit numeric code from 1000 to 9999.
 */
export function generate4DigitOtp(): string {
  return crypto.randomInt(1000, 10000).toString();
}

/**
 * Masks an email for safe display on screen (e.g. "ra***h@gmail.com").
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'your registered email';
  const parts = email.trim().toLowerCase().split('@');
  const local = parts[0];
  const domain = parts.slice(1).join('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local.slice(0, 2);
  const last = local.slice(-1);
  const stars = '*'.repeat(Math.min(5, Math.max(3, local.length - 3)));
  return `${first}${stars}${last}@${domain}`;
}

/**
 * Creates a stateless HMAC-SHA256 challenge token encoding expiration & attempt count.
 * The raw OTP is NEVER revealed in the token.
 */
export function createChallengeToken(
  bookingId: string,
  parentEmail: string,
  otp: string,
  expiresAt: number,
  attempts = 0
): string {
  const normEmail = (parentEmail || '').trim().toLowerCase();
  const data = `${bookingId}:${normEmail}:${otp}:${expiresAt}:${attempts}`;
  const hmac = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
  return `${expiresAt}.${attempts}.${hmac}`;
}

/**
 * Creates an unlock token upon successful OTP verification.
 * The parent page submits this token with the signed booking to prove authorization.
 */
export function createUnlockToken(bookingId: string, parentEmail: string, expiresAt: number): string {
  const normEmail = (parentEmail || '').trim().toLowerCase();
  const data = `${bookingId}:${normEmail}:UNLOCKED:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
  return `${expiresAt}.${hmac}`;
}

/**
 * Verifies that a parent session has been properly unlocked via OTP.
 */
export function verifyUnlockToken(bookingId: string, parentEmail: string, unlockToken: string): boolean {
  if (!unlockToken || typeof unlockToken !== 'string') return false;
  const parts = unlockToken.split('.');
  if (parts.length !== 2) return false;
  const [expStr, signature] = parts;
  const expiresAt = Number(expStr);
  // Allow up to 3 hours grace period for parent to complete reading terms & signing
  if (isNaN(expiresAt) || Date.now() > expiresAt + 3 * 60 * 60 * 1000) {
    return false;
  }
  const normEmail = (parentEmail || '').trim().toLowerCase();
  const expectedHmac = crypto.createHmac('sha256', OTP_SECRET).update(`${bookingId}:${normEmail}:UNLOCKED:${expiresAt}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedHmac, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Verifies an entered 4-digit OTP against either stored state or HMAC challenge token.
 */
export function verifyEnteredOtp(
  bookingId: string,
  parentEmail: string,
  enteredOtp: string,
  challengeToken?: string,
  storedOtp?: string,
  storedExpiresAt?: string
): {
  success: boolean;
  error?: string;
  unlockToken?: string;
  remainingAttempts?: number;
} {
  const cleanEntered = (enteredOtp || '').trim().replace(/\D/g, '');
  if (!cleanEntered || cleanEntered.length !== 4) {
    return { success: false, error: 'Please enter a valid 4-digit numeric verification code.' };
  }

  const normEmail = (parentEmail || '').trim().toLowerCase();

  // 1. Check against server-stored record if present
  if (storedOtp) {
    const isExpired = storedExpiresAt ? new Date(storedExpiresAt).getTime() < Date.now() : false;
    if (isExpired) {
      return { success: false, error: 'This verification code has expired. Please click "Resend Code".' };
    }
    if (storedOtp.trim() === cleanEntered) {
      const sessionExpires = Date.now() + 3 * 60 * 60 * 1000;
      const unlockToken = createUnlockToken(bookingId, normEmail, sessionExpires);
      return { success: true, unlockToken };
    }
  }

  // 2. Check against stateless HMAC Challenge token
  if (challengeToken && typeof challengeToken === 'string') {
    const parts = challengeToken.split('.');
    if (parts.length === 3) {
      const [expStr, attemptsStr, signature] = parts;
      const expiresAt = Number(expStr);
      const attempts = Number(attemptsStr);

      if (!isNaN(expiresAt) && !isNaN(attempts)) {
        if (Date.now() > expiresAt) {
          return { success: false, error: 'This verification code has expired. Please click "Resend Code".' };
        }
        if (attempts >= MAX_ATTEMPTS) {
          return { success: false, error: 'Maximum attempts reached. Please request a new verification code.' };
        }

        const expectedHmac = crypto
          .createHmac('sha256', OTP_SECRET)
          .update(`${bookingId}:${normEmail}:${cleanEntered}:${expiresAt}:${attempts}`)
          .digest('hex');

        let matches = false;
        try {
          matches = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedHmac, 'hex'));
        } catch {
          matches = false;
        }

        if (matches) {
          const sessionExpires = Date.now() + 3 * 60 * 60 * 1000;
          const unlockToken = createUnlockToken(bookingId, normEmail, sessionExpires);
          return { success: true, unlockToken };
        }

        const remainingAttempts = Math.max(0, MAX_ATTEMPTS - (attempts + 1));
        return {
          success: false,
          error: `Incorrect verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new code.'}`,
          remainingAttempts
        };
      }
    }
  }

  return { success: false, error: 'Incorrect verification code. Please check your parent email inbox.' };
}
