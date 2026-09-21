import { Router } from 'express';
import { z } from 'zod';
import { fail, ok } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import {
  DmError,
  getOrCreateDmThread,
  listDmMessages,
  listDmThreads,
  markDmRead,
  sendDmMessage,
  unreadDmCount
} from '../services/dm';

export const dmRouter = Router();
dmRouter.use(requireAuth);

function handleDmError(res: Parameters<typeof fail>[0], error: unknown) {
  if (error instanceof DmError) {
    return fail(res, error.message, error.status, error.code);
  }
  return fail(res, error instanceof Error ? error.message : '操作失败');
}

dmRouter.get('/unread', async (req, res) => {
  try {
    const count = await unreadDmCount(req.user!.id);
    return ok(res, { count });
  } catch (error) {
    return handleDmError(res, error);
  }
});

dmRouter.get('/threads', async (req, res) => {
  try {
    const items = await listDmThreads(req.user!.id);
    return ok(res, items);
  } catch (error) {
    return handleDmError(res, error);
  }
});

const openSchema = z.object({
  expertId: z.string().min(1)
});

dmRouter.post('/threads', async (req, res) => {
  const parsed = openSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请选择要私信的创作者');
  try {
    const thread = await getOrCreateDmThread(req.user!.id, parsed.data.expertId);
    return ok(res, thread, 201);
  } catch (error) {
    return handleDmError(res, error);
  }
});

dmRouter.get('/threads/:id/messages', async (req, res) => {
  try {
    const data = await listDmMessages(req.user!.id, req.params.id);
    return ok(res, data);
  } catch (error) {
    return handleDmError(res, error);
  }
});

const sendSchema = z.object({
  body: z.string().min(1).max(500)
});

dmRouter.post('/threads/:id/messages', async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '消息不能为空，且不超过 500 字');
  try {
    const data = await sendDmMessage(req.user!.id, req.params.id, parsed.data.body);
    return ok(res, data, 201);
  } catch (error) {
    return handleDmError(res, error);
  }
});

dmRouter.post('/threads/:id/read', async (req, res) => {
  try {
    await markDmRead(req.user!.id, req.params.id);
    return ok(res, { ok: true });
  } catch (error) {
    return handleDmError(res, error);
  }
});
