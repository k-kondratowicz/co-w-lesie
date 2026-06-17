export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SOLVE_TIMEOUT_MS = 15_000;

export type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  'before-interactive-callback'?: () => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  'timeout-callback'?: () => void;
  appearance?: 'always' | 'execute' | 'interaction-only';
};

type TurnstileApi = {
  render: (element: HTMLElement, options: TurnstileRenderOptions) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function isTurnstileEnabled(): boolean {
  return Boolean(TURNSTILE_SITE_KEY);
}

let scriptPromise: Promise<void> | null = null;

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile is browser-only'));
  }
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Turnstile script failed to load'));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

// Solves a one-shot Turnstile challenge, resolving with the token (or null when it can't be solved
// without interaction or errors out). Managed widgets clear silently for legitimate visitors; if an
// interactive challenge is required it appears centered (appearance: interaction-only). When no site
// key is configured we resolve null and the server, also unconfigured, accepts the request.
export async function getTurnstileToken(): Promise<string | null> {
  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  try {
    await loadTurnstileScript();
  } catch {
    return null;
  }

  const api = window.turnstile;
  if (!api) {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    const container = document.createElement('div');
    container.className = 'fixed top-1/2 left-1/2 z-[70] -translate-x-1/2 -translate-y-1/2';
    document.body.appendChild(container);

    let widgetId: string | null = null;
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (token: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (widgetId) {
        api.remove(widgetId);
      }
      container.remove();
      resolve(token);
    };

    timer = setTimeout(() => finish(null), SOLVE_TIMEOUT_MS);

    try {
      widgetId = api.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: 'interaction-only',
        callback: (token) => finish(token),
        'error-callback': () => finish(null),
        'timeout-callback': () => finish(null),
      });
    } catch {
      finish(null);
    }
  });
}
