const TOKEN_KEY = 'checker-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, auth = true, timeoutMs = 15000, headers, signal, ...rest } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  const finalHeaders = new Headers(headers);
  let finalBody: BodyInit | undefined;

  if (body instanceof FormData) {
    finalBody = body;
  } else if (body !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    finalBody = JSON.stringify(body);
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...rest, headers: finalHeaders, body: finalBody, signal: controller.signal });
  } catch (err) {
    const aborted =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    if (aborted) {
      throw new ApiError(408, 'Request timed out. Try again or use a better connection.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401) {
    setToken(null);
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? res.statusText;
    throw new ApiError(res.status, message, (data as { details?: unknown })?.details);
  }

  return data as T;
}
