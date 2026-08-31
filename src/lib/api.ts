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

  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'include',
      ...init,
      headers
    });
  } catch {
    throw new ApiError(
      '无法连接后台 API，请运行 npm run dev:all（或分别启动 dev + dev:api）',
      0,
      'NETWORK_ERROR'
    );
  }

  const json = (await res.json().catch(() => null)) as
    | { ok: boolean; data?: T; error?: { code?: string; message?: string } }
    | null;

  if (!res.ok || !json?.ok) {
    let message = json?.error?.message || `请求失败 (${res.status})`;
    if (!json?.error?.message && (res.status === 500 || res.status === 502 || res.status === 503)) {
      message = '后台 API 未连接，请先运行 npm run dev:api 或 npm run dev:all';
    }
    throw new ApiError(message, res.status, json?.error?.code || 'REQUEST_FAILED');
  }

  return json.data as T;
}
