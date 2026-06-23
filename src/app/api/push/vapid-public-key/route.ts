export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The client needs the VAPID public key to call pushManager.subscribe(). It is public by design
// (only the private key must stay secret), but served from an endpoint so it is never baked into
// the bundle and can rotate without a rebuild.
export function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return Response.json({ error: 'Powiadomienia są chwilowo niedostępne' }, { status: 503 });
  }

  return Response.json({ publicKey });
}
