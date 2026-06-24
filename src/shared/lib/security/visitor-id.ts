export const VISITOR_ID_HEADER = 'x-visitor-id';

// Anonymous bearer the client generates and persists. Accept UUIDs and the non-secure-context
// fallback id (Date.now()-random) the client uses over plain http on a LAN, so dev still works.
const VISITOR_ID_PATTERN = /^[A-Za-z0-9._-]{8,100}$/;

export function readVisitorId(request: Request): string | null {
  const value = request.headers.get(VISITOR_ID_HEADER);

  if (!value || !VISITOR_ID_PATTERN.test(value)) {
    return null;
  }

  return value;
}
