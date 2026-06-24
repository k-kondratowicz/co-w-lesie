export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };

    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function get<T>(url: string, params?: Record<string, string | undefined>, headers?: HeadersInit): Promise<T> {
  const filtered: Record<string, string> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) {
        filtered[k] = v;
      }
    }
  }

  const search = Object.keys(filtered).length ? `?${new URLSearchParams(filtered)}` : '';
  const res = await fetch(`${url}${search}`, { headers });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return parseResponseBody<T>(res);
}

export async function post<T>(url: string, body: unknown, headers?: HeadersInit): Promise<T> {
  const isRaw = body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array || body instanceof FormData;
  const mergedHeaders = new Headers(headers);

  if (!isRaw && !mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: mergedHeaders,
    body: isRaw ? (body as BodyInit) : JSON.stringify(body),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return parseResponseBody<T>(res);
}

export async function patch<T>(url: string, body: unknown, headers?: HeadersInit): Promise<T> {
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { method: 'PATCH', headers: mergedHeaders, body: JSON.stringify(body) });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return parseResponseBody<T>(res);
}

export async function del(url: string, headers?: HeadersInit, body?: unknown): Promise<void> {
  const mergedHeaders = new Headers(headers);
  if (body !== undefined && !mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    method: 'DELETE',
    headers: mergedHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
}

async function parseResponseBody<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, `Invalid response body (${res.status})`);
  }
}
