import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { writeAudit } from '../lib/audit';
import { SESSION_COOKIE, requireAuth } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '邮箱或密码格式不正确');

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return fail(res, '账号或密码错误', 401, 'INVALID_CREDENTIALS');

  const matched = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!matched) return fail(res, '账号或密码错误', 401, 'INVALID_CREDENTIALS');

  const session = await prisma.session.create({
    data: {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  res.cookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  await writeAudit({
    actorId: user.id,
    action: 'login',
    targetType: 'session',
    targetId: session.id
  });

  return ok(res, { id: user.id, email: user.email, name: user.name, role: user.role });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (sid) await prisma.session.delete({ where: { id: sid } }).catch(() => undefined);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  return ok(res, { loggedOut: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  return ok(res, req.user);
});

/** 前台演示：登录普通用户账号，用于认证申请联调 */
authRouter.post('/demo-user', async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: 'user-demo' } });
  if (!user) return fail(res, '演示用户未初始化，请先执行数据库 seed');

  const session = await prisma.session.create({
    data: {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  res.cookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return ok(res, { id: user.id, email: user.email, name: user.name, role: user.role });
});
