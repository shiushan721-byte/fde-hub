import { Router } from 'express';
import { z } from 'zod';
import { fail, ok } from '../lib/http';
import { findExpertForUser } from '../services/creatorAgents';
import {
  addRebateAdjustment,
  checkAgentRebate,
  createRebateRate,
  enableAgentRebate,
  enrollRebate,
  getRebateCampaign,
  listRebateAdmin,
  listUsageSummary,
  markSpecDownloaded,
  rebateIncome,
  recordModelUsage,
  setAgentRebateStatus,
  setEnrollmentStatus,
  setRebateRateStatus,
  updateRebateRate,
  settleRebatePeriod
} from '../services/rebateActivity';

export const rebateMeRouter = Router();

function statusOf(error: unknown) {
  return (error as Error & { status?: number }).status;
}

rebateMeRouter.get('/campaign', async (req, res) => {
  try {
    return ok(res, await getRebateCampaign(req.user!.id));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '加载失败', statusOf(error) || 400);
  }
});

rebateMeRouter.post('/enroll', async (req, res) => {
  try {
    return ok(res, await enrollRebate(req.user!.id));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '报名失败', statusOf(error) || 400);
  }
});

rebateMeRouter.get('/spec', async (req, res) => {
  try {
    const markdown = await markSpecDownloaded(req.user!.id);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hellome-rebate-skill-spec.md"');
    return res.send(markdown);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '下载失败', statusOf(error) || 400);
  }
});

rebateMeRouter.post('/agents/:id/check', async (req, res) => {
  try {
    return ok(res, await checkAgentRebate(req.user!.id, req.params.id));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '检查失败', statusOf(error) || 400);
  }
});

rebateMeRouter.post('/agents/:id/enable', async (req, res) => {
  try {
    return ok(res, await enableAgentRebate(req.user!.id, req.params.id));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '开启失败', statusOf(error) || 400);
  }
});

const runSchema = z.object({
  idempotencyKey: z.string().trim().min(6).max(120),
  agentId: z.string().trim().min(1),
  modelId: z.string().trim().min(1).max(80),
  channel: z.enum(['official', 'self']),
  tokens: z.coerce.number().int().min(0),
  amountCents: z.coerce.number().int().min(0).default(0),
  occurredAt: z.string().datetime().optional()
});

rebateMeRouter.post('/runs', async (req, res) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '上报参数不合法');
  try {
    const row = await recordModelUsage({
      ...parsed.data,
      userId: req.user!.id,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date()
    });
    return ok(res, {
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      eligible: row.eligible,
      rateBps: row.rateBps,
      rebateCents: row.rebateCents,
      amountCents: row.amountCents,
      channel: row.channel
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '上报失败', statusOf(error) || 400);
  }
});

rebateMeRouter.get('/usage', async (req, res) => {
  try {
    const expert = await findExpertForUser(req.user!.id);
    if (!expert) return fail(res, '仅认证专家可查看', 403);
    const from = typeof req.query.from === 'string' && req.query.from ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' && req.query.to ? new Date(req.query.to) : undefined;
    const items = await listUsageSummary({
      expertId: expert.id,
      agentId: typeof req.query.agentId === 'string' ? req.query.agentId : undefined,
      channel: typeof req.query.channel === 'string' ? req.query.channel : undefined,
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined
    });
    return ok(res, items);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '加载失败', 400);
  }
});

rebateMeRouter.get('/income', async (req, res) => {
  try {
    const expert = await findExpertForUser(req.user!.id);
    if (!expert) return fail(res, '仅认证专家可查看', 403);
    const from = typeof req.query.from === 'string' && req.query.from ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' && req.query.to ? new Date(req.query.to) : undefined;
    return ok(res, await rebateIncome(
      expert.id,
      from && !Number.isNaN(from.getTime()) ? from : undefined,
      to && !Number.isNaN(to.getTime()) ? to : undefined
    ));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '加载失败', 400);
  }
});

export const rebateAdminRouter = Router();

rebateAdminRouter.get('/', async (_req, res) => {
  return ok(res, await listRebateAdmin());
});

rebateAdminRouter.post('/enrollments/:expertId', async (req, res) => {
  const status = req.body?.status;
  if (status !== 'paused' && status !== 'spec_downloaded' && status !== 'enrolled') {
    return fail(res, '状态不合法');
  }
  try {
    return ok(res, await setEnrollmentStatus(req.params.expertId, status));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '更新失败', statusOf(error) || 400);
  }
});

rebateAdminRouter.post('/agents/:agentId', async (req, res) => {
  const status = req.body?.status;
  if (status !== 'active' && status !== 'paused' && status !== 'passed') return fail(res, '状态不合法');
  try {
    return ok(res, await setAgentRebateStatus(req.params.agentId, status));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '更新失败', statusOf(error) || 400);
  }
});

rebateAdminRouter.post('/rates', async (req, res) => {
  const parsed = z
    .object({
      scope: z.enum(['platform', 'expert', 'agent']),
      expertId: z.string().optional(),
      agentId: z.string().optional(),
      modelId: z.string().trim().min(1),
      ratePercent: z.coerce.number().min(0).max(100),
      effectiveFrom: z.string().min(4)
    })
    .safeParse(req.body);
  if (!parsed.success) return fail(res, '比例参数不合法');
  try {
    const row = await createRebateRate({
      scope: parsed.data.scope,
      expertId: parsed.data.expertId,
      agentId: parsed.data.agentId,
      modelId: parsed.data.modelId,
      rateBps: Math.round(parsed.data.ratePercent * 100),
      effectiveFrom: new Date(parsed.data.effectiveFrom)
    });
    return ok(res, row);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '保存失败', statusOf(error) || 400);
  }
});

rebateAdminRouter.patch('/rates/:id', async (req, res) => {
  const parsed = z
    .object({
      ratePercent: z.coerce.number().min(0).max(100),
      effectiveFrom: z.string().min(4)
    })
    .safeParse(req.body);
  if (!parsed.success) return fail(res, '比例参数不合法');
  try {
    return ok(res, await updateRebateRate(req.params.id, {
      rateBps: Math.round(parsed.data.ratePercent * 100),
      effectiveFrom: new Date(parsed.data.effectiveFrom)
    }));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '保存失败', statusOf(error) || 400);
  }
});

rebateAdminRouter.post('/rates/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (status !== 'active' && status !== 'paused') return fail(res, '状态不合法');
  try {
    return ok(res, await setRebateRateStatus(req.params.id, status));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '更新失败', statusOf(error) || 400);
  }
});

rebateAdminRouter.post('/adjustments', async (req, res) => {
  const parsed = z
    .object({
      expertId: z.string().min(1),
      usageId: z.string().optional(),
      amountYuan: z.coerce.number(),
      reason: z.string().trim().min(1)
    })
    .safeParse(req.body);
  if (!parsed.success) return fail(res, '调整参数不合法');
  try {
    return ok(res, await addRebateAdjustment({
      expertId: parsed.data.expertId,
      usageId: parsed.data.usageId,
      amountCents: Math.round(parsed.data.amountYuan * 100),
      reason: parsed.data.reason
    }));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '调整失败', statusOf(error) || 400);
  }
});

rebateAdminRouter.post('/settlements', async (req, res) => {
  const parsed = z.object({
    expertId: z.string().min(1),
    period: z.string().regex(/^\d{4}-\d{2}$/)
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, '结算参数不合法');
  try {
    return ok(res, await settleRebatePeriod(parsed.data.expertId, parsed.data.period));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '结算失败', statusOf(error) || 400);
  }
});

rebateAdminRouter.post('/usages', async (req, res) => {
  const parsed = runSchema.extend({ userId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return fail(res, '消费参数不合法');
  try {
    const row = await recordModelUsage({
      ...parsed.data,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date()
    });
    return ok(res, row);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '记账失败', statusOf(error) || 400);
  }
});
