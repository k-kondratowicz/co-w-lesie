// Shared auth for scheduler-triggered cron routes. Fails closed when CRON_SECRET is unset so a
// misconfigured deploy never exposes a sync endpoint publicly.
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${secret}`;
}
