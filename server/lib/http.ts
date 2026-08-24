import type { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(res: Response, message: string, status = 400, code = 'BAD_REQUEST') {
  return res.status(status).json({ ok: false, error: { code, message } });
}
