// Vercel puts the real client IP first in x-forwarded-for; used to key rate limits and vote dedupe.
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
