import type { init } from '@sentry/nextjs';

type DataCollection = NonNullable<Parameters<typeof init>[0]['dataCollection']>;

const NETWORK_IDENTITY_KEYS = ['forwarded', '-ip', 'remote-', 'via', '-user'];

// Sentry 11 collects IPs, cookies, request bodies and DB query data unless told otherwise, but the
// privacy policy promises no IPs or personal data. This is Sentry's documented v10 `sendDefaultPii: false` baseline.
export const SENTRY_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: NETWORK_IDENTITY_KEYS },
    response: { deny: NETWORK_IDENTITY_KEYS },
  },
  httpBodies: [],
  urlQueryParams: { deny: NETWORK_IDENTITY_KEYS },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
};
