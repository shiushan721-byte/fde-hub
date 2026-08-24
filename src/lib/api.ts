export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers
  });

  const json = (await res.json().catch(() => null)) as
    | { ok: boolean; data?: T; error?: { code?: string; message?: string } }
    | null;

  if (!res.ok || !json?.ok) {
    throw new ApiError(
      json?.error?.message || `请求失败 (${res.status})`,
      res.status,
      json?.error?.code || 'REQUEST_FAILED'
    );
  }

  return json.data as T;
}
