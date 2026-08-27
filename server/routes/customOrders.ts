import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import {
  acceptDeliveryByBuyer,
  confirmEscrow,
  confirmProposalByBuyer,
  createCustomOrder,
  createCustomOrderFromLeadForCreator,
  initiatePayment,
  mapOrder,
  openDisputeByBuyer,
  rejectProposalByBuyer,
  requestProposalRevisionByBuyer,
  requestRevisionByBuyer,
  resolveDisputeByOps,
  settleOrder,
  startDevelopment,
  submitDelivery,
  submitDeliveryProposal,
  submitQuote
} from '../services/customOrder';
import { runCustomOrderJobs } from '../services/customOrderJobs';

export const customOrderRouter = Router();
customOrderRouter.use(requireAuth);

/** 运营手动触发订单定时任务（须在 /:id 路由之前注册） */
customOrderRouter.post('/jobs/run', async (req, res) => {
  const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'operator';
  if (!isAdmin) return fail(res, '仅运营可执行', 403);
  try {
    const result = await runCustomOrderJobs();
    return ok(res, result);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '任务执行失败');
  }
});

const createSchema = z.object({
  baseAgentId: z.string().min(1),
  baseAgentTitle: z.string().optional(),
  baseAgentVersion: z.string().optional(),
  expertId: z.string().optional(),
  title: z.string().min(1),
  customizationSpec: z.any(),
  priceCents: z.number().int().optional(),
  deliveryDays: z.number().int().optional(),
  serviceScope: z.string().optional(),
  leadId: z.string().optional()
});

const fromLeadSchema = z.object({
  clientName: z.string().optional(),
  clientCompany: z.string().optional(),
  agentId: z.string().min(1),
  agentTitle: z.string().min(1),
  baseAgentVersion: z.string().optional(),
  customizationSummary: z.string().optional(),
  notes: z.string().optional(),
  expertId: z.string().optional()
});

const proposalSchema = z.object({
  baseAgentId: z.string().optional(),
  baseAgentTitle: z.string().optional(),
  baseAgentVersion: z.string().optional(),
  customizationItems: z.array(z.string().min(1)).min(1),
  excludedItems: z.array(z.string()).optional(),
  deliverables: z.array(z.string().min(1)).min(1),
  priceCents: z.number().int().positive().optional(),
  priceYuan: z.number().positive().optional(),
  deliveryDays: z.number().int().positive(),
  freeRevisionCount: z.number().int().min(0).optional(),
  acceptanceCriteria: z.string().min(1),
  afterSalePeriodDays: z.number().int().positive().optional(),
  needsCustomerData: z.boolean().optional(),
  customerDataNote: z.string().optional(),
  needsThirdPartyAccess: z.boolean().optional(),
  thirdPartyNote: z.string().optional(),
  note: z.string().optional()
});

/** 用户：创建定制订单（咨询阶段） */
customOrderRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '定制订单资料不完整');
  try {
    const order = await createCustomOrder({
      buyerUserId: req.user!.id,
      ...parsed.data,
      baseAgentTitle: parsed.data.baseAgentTitle || parsed.data.title,
      customizationSpec: parsed.data.customizationSpec
    });
    return ok(res, mapOrder(order), 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '创建失败');
  }
});

customOrderRouter.get('/mine', async (req, res) => {
  const items = await prisma.customOrder.findMany({
    where: { buyerUserId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      instance: true,
      deliveries: { orderBy: { createdAt: 'desc' }, take: 5 },
      creator: { select: { id: true, name: true, email: true } }
    }
  });
  return ok(res, items.map(mapOrder));
});

customOrderRouter.get('/creator', async (req, res) => {
  const items = await prisma.customOrder.findMany({
    where: {
      OR: [
        { creatorUserId: req.user!.id },
        { creatorUserId: null, status: { in: ['consulting', 'pending_quote'] } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      instance: true,
      deliveries: { orderBy: { createdAt: 'desc' }, take: 8 },
      buyer: { select: { id: true, name: true, email: true } }
    }
  });
  return ok(res, items.map(mapOrder));
});

/** 创作者：从咨询线索创建交付订单 */
customOrderRouter.post('/from-lead/:leadId', async (req, res) => {
  const parsed = fromLeadSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '线索资料不完整');
  try {
    const order = await createCustomOrderFromLeadForCreator({
      leadId: req.params.leadId,
      creatorUserId: req.user!.id,
      fallback: parsed.data
    });
    const full = await prisma.customOrder.findUnique({
      where: { id: order.id },
      include: {
        instance: true,
        deliveries: { orderBy: { createdAt: 'desc' }, take: 5 },
        buyer: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    return ok(res, mapOrder(full!), 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '创建失败');
  }
});

customOrderRouter.get('/by-lead/:leadId', async (req, res) => {
  const order = await prisma.customOrder.findFirst({
    where: { leadId: req.params.leadId },
    include: {
      instance: true,
      deliveries: { orderBy: { createdAt: 'desc' }, take: 5 },
      buyer: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } }
    }
  });
  if (!order) return ok(res, null);
  const uid = req.user!.id;
  const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'operator';
  if (!isAdmin && order.buyerUserId !== uid && order.creatorUserId !== uid) {
    return fail(res, '无权查看', 403);
  }
  return ok(res, mapOrder(order));
});

customOrderRouter.get('/workspace/instances', async (req, res) => {
  const items = await prisma.privateAgentInstance.findMany({
    where: {
      customerUserId: req.user!.id,
      status: { in: ['active', 'revision'] }
    },
    orderBy: { updatedAt: 'desc' },
    include: { order: true }
  });
  return ok(
    res,
    items.map((item) => ({
      id: item.id,
      title: item.title,
      currentVersion: item.currentVersion,
      status: item.status,
      baseAgentId: item.baseAgentId,
      baseAgentTitle: item.baseAgentTitle,
      baseAgentVersion: item.baseAgentVersion,
      orderId: item.orderId,
      orderNo: item.order.orderNo,
      orderStatus: item.order.status,
      acceptanceDeadlineAt: item.order.acceptanceDeadlineAt,
      publishedAt: item.publishedAt,
      visibility: item.visibility
    }))
  );
});

customOrderRouter.get('/:id', async (req, res) => {
  const order = await prisma.customOrder.findUnique({
    where: { id: req.params.id },
    include: {
      instance: true,
      deliveries: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { createdAt: 'asc' } },
      buyer: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } }
    }
  });
  if (!order) return fail(res, '订单不存在', 404, 'NOT_FOUND');
  const uid = req.user!.id;
  const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'operator';
  if (!isAdmin && order.buyerUserId !== uid && order.creatorUserId !== uid) {
    return fail(res, '无权查看该订单', 403, 'FORBIDDEN');
  }
  return ok(res, {
    ...mapOrder(order),
    events: order.events
  });
});

/** 创作者：发起定制交付方案 */
customOrderRouter.post('/:id/proposal', async (req, res) => {
  const parsed = proposalSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请完整填写交付方案');
  const priceCents =
    parsed.data.priceCents ?? Math.round((parsed.data.priceYuan || 0) * 100);
  if (priceCents <= 0) return fail(res, '交付价格须大于 0');
  try {
    const order = await submitDeliveryProposal({
      orderId: req.params.id,
      creatorUserId: req.user!.id,
      proposal: { ...parsed.data, priceCents }
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '提交方案失败');
  }
});

const quoteSchema = z.object({
  priceYuan: z.number().positive().optional(),
  priceCents: z.number().int().positive().optional(),
  deliveryDays: z.number().int().positive(),
  serviceScope: z.string().min(1),
  quoteNote: z.string().optional()
});

/** 兼容旧报价接口 → 转为交付方案 */
customOrderRouter.post('/:id/quote', async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请填写价格、交付天数与服务范围');
  const priceCents =
    parsed.data.priceCents ?? Math.round((parsed.data.priceYuan || 0) * 100);
  if (priceCents <= 0) return fail(res, '报价金额须大于 0');
  try {
    const order = await submitQuote({
      orderId: req.params.id,
      creatorUserId: req.user!.id,
      priceCents,
      deliveryDays: parsed.data.deliveryDays,
      serviceScope: parsed.data.serviceScope,
      quoteNote: parsed.data.quoteNote
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '报价失败');
  }
});

customOrderRouter.post('/:id/confirm-proposal', async (req, res) => {
  try {
    const order = await confirmProposalByBuyer({
      orderId: req.params.id,
      buyerUserId: req.user!.id,
      ackEscrowRules: Boolean(req.body?.ackEscrowRules)
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '确认方案失败');
  }
});

customOrderRouter.post('/:id/reject-proposal', async (req, res) => {
  try {
    const order = await rejectProposalByBuyer({
      orderId: req.params.id,
      buyerUserId: req.user!.id,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '操作失败');
  }
});

customOrderRouter.post('/:id/request-proposal-revision', async (req, res) => {
  const feedback = z.string().min(1).safeParse(req.body?.feedback);
  if (!feedback.success) return fail(res, '请说明需要修改的内容');
  try {
    const order = await requestProposalRevisionByBuyer({
      orderId: req.params.id,
      buyerUserId: req.user!.id,
      feedback: feedback.data
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '操作失败');
  }
});

customOrderRouter.post('/:id/pay', async (req, res) => {
  const channel = req.body?.channel === 'alipay' ? 'alipay' : 'wechat';
  try {
    const result = await initiatePayment({
      orderId: req.params.id,
      buyerUserId: req.user!.id,
      channel
    });
    return ok(res, {
      order: mapOrder(result.order),
      payment: result.payment
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '发起付款失败');
  }
});

customOrderRouter.post('/:id/confirm-escrow', async (req, res) => {
  try {
    const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'operator';
    const channel =
      req.body?.channel === 'alipay' || req.body?.channel === 'wechat'
        ? req.body.channel
        : undefined;
    const order = await confirmEscrow({
      orderId: req.params.id,
      actorId: req.user!.id,
      asAdmin: isAdmin,
      channel
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '确认到账失败');
  }
});

customOrderRouter.post('/:id/start-development', async (req, res) => {
  try {
    const result = await startDevelopment(req.params.id, req.user!.id);
    return ok(res, {
      order: mapOrder(result.order),
      instance: result.instance
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '开工失败');
  }
});

customOrderRouter.post('/:id/accept', async (_req, res) => {
  return fail(res, '请上传 Skill 包并提交交付审核', 400);
});

const submitSchema = z.object({
  version: z.string().min(1),
  changelog: z.string().min(1),
  completedItems: z.array(z.string()).optional(),
  skillPayload: z.unknown().optional(),
  usageGuide: z.string().optional(),
  testAccountNote: z.string().optional(),
  pendingItemsNote: z.string().optional()
});

customOrderRouter.post('/:id/submit-delivery', async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请填写交付版本与更新说明');
  try {
    const result = await submitDelivery({
      orderId: req.params.id,
      creatorUserId: req.user!.id,
      ...parsed.data
    });
    return ok(res, {
      delivery: {
        ...result.delivery,
        hermesReport: result.hermes.report,
        completedItems: parsed.data.completedItems || []
      },
      hermes: result.hermes
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '提交失败');
  }
});

customOrderRouter.post('/:id/buyer-accept', async (req, res) => {
  try {
    const order = await acceptDeliveryByBuyer({
      orderId: req.params.id,
      buyerUserId: req.user!.id,
      feedback: typeof req.body?.feedback === 'string' ? req.body.feedback : undefined
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '验收失败');
  }
});

customOrderRouter.post('/:id/settle', async (req, res) => {
  try {
    const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'operator';
    const order = await prisma.customOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return fail(res, '订单不存在', 404);
    if (!isAdmin && order.creatorUserId !== req.user!.id && order.buyerUserId !== req.user!.id) {
      return fail(res, '无权操作', 403);
    }
    const settled = await settleOrder(req.params.id, req.user!.id);
    return ok(res, mapOrder(settled));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '结算失败');
  }
});

customOrderRouter.post('/:id/request-revision', async (req, res) => {
  const feedback = z.string().min(1).safeParse(req.body?.feedback);
  if (!feedback.success) return fail(res, '请填写修改说明');
  try {
    const unmetItems = Array.isArray(req.body?.unmetItems)
      ? req.body.unmetItems.filter((x: unknown) => typeof x === 'string')
      : undefined;
    const order = await requestRevisionByBuyer({
      orderId: req.params.id,
      buyerUserId: req.user!.id,
      feedback: feedback.data,
      unmetItems
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '申请修改失败');
  }
});

customOrderRouter.post('/:id/open-dispute', async (req, res) => {
  const reason = z.string().min(1).safeParse(req.body?.reason);
  if (!reason.success) return fail(res, '请说明争议原因');
  try {
    const order = await openDisputeByBuyer({
      orderId: req.params.id,
      buyerUserId: req.user!.id,
      reason: reason.data,
      evidenceNote: typeof req.body?.evidenceNote === 'string' ? req.body.evidenceNote : undefined
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '发起争议失败');
  }
});

customOrderRouter.post('/:id/resolve-dispute', async (req, res) => {
  const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'operator';
  if (!isAdmin) return fail(res, '仅运营可判定争议', 403);
  const resolution = z
    .enum(['continue_delivery', 'partial_refund', 'full_refund', 'confirm_complete'])
    .safeParse(req.body?.resolution);
  if (!resolution.success) return fail(res, '请选择判定结果');
  try {
    const order = await resolveDisputeByOps({
      orderId: req.params.id,
      actorId: req.user!.id,
      resolution: resolution.data,
      note: typeof req.body?.note === 'string' ? req.body.note : undefined,
      refundCents:
        typeof req.body?.refundCents === 'number'
          ? req.body.refundCents
          : typeof req.body?.refundYuan === 'number'
            ? Math.round(req.body.refundYuan * 100)
            : undefined
    });
    return ok(res, mapOrder(order));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '判定失败');
  }
});
