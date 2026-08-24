import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { fail } from '../lib/http';

export const SESSION_COOKIE = 'fde_sid';

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!sid) return next();
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true }
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: sid } }).catch(() => undefined);
    return next();
  }
  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role
  };
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return fail(res, '请先登录', 401, 'UNAUTHENTICATED');
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return fail(res, '请先登录', 401, 'UNAUTHENTICATED');
  if (req.user.role !== 'super_admin' && req.user.role !== 'operator') {
    return fail(res, '没有后台权限', 403, 'FORBIDDEN');
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return fail(res, '请先登录', 401, 'UNAUTHENTICATED');
  if (req.user.role !== 'super_admin') {
    return fail(res, '仅超级管理员可执行此操作', 403, 'FORBIDDEN');
  }
  next();
}
