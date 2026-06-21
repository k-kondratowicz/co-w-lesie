const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verifies a Cloudflare Turnstile token. Returns true when no secret is configured, so local and
// unconfigured environments keep working - production MUST set TURNSTILE_SECRET_KEY for this to
// actually guard anything. Anti-abuse, not auth: we fail open on a missing secret, closed on a
// present-but-invalid token.
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) {
    body.set('remoteip', ip);
  }

  try {
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body });
    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { success?: boolean };

    return data.success === true;
  } catch {
    return false;
  }
}
