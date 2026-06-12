import { type NextRequest, NextResponse } from 'next/server';

// CSRF-style hardening: route handlers (unlike Server Actions) don't get an automatic
// same-origin check, so we reject cross-site state-changing requests here. Reads are public.
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(request: NextRequest): boolean {
  // Modern browsers send Sec-Fetch-Site; trust it when present.
  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite) {
    return fetchSite === 'same-origin' || fetchSite === 'none';
  }

  // Fallback: compare the Origin host to the request Host. Same-origin navigations and
  // non-browser clients (no CSRF risk) may omit Origin entirely.
  const origin = request.headers.get('origin');

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
