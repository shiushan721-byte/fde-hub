import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { parseJson } from '../lib/json';
import { requireAuth } from '../middleware/auth';
import { mapOrder } from '../services/customOrder';
import { notifyUser, resolveExpertUserId } from '../services/notifications';

const customServicesRouter = Router();
customServicesRouter.use(requireAuth);

type DealStageKey =
  | 'consulting'
  | 'awaiting_proposal_confirm'
  | 'awaiting_payment'
  | 'in_delivery'
  | 'in_review'
  | 'pending_acceptance'
  | 'completed'
  | 'dispute'
  | 'closed'
  | 'unknown';

function leadPayloadStandardVersion(payload: any): string | undefined {
  // consultation 提交时前端一般会传 standardVersionAtRequest/baseAgentVersion
  if (!payload || typeof payload !== 'object') return undefined;
  return (
    payload.standardVersionAtRequest ||
    payload.baseAgentVersion ||
    payload.standardVersion ||
    undefined
  );
}

function computeStageFromOrder(
  order: any,
  audience: 'buyer' | 'creator' = 'creator'
): { stageKey: DealStageKey; stageLabel: string } {
  switch (order.status) {
    case 'consulting':
    case 'pending_quote':
      return { stageKey: 'consulting', stageLabel: '咨询中' };
    case 'awaiting_proposal_confirm':
      return { stageKey: 'awaiting_proposal_confirm', stageLabel: '待确认方案' };
    case 'awaiting_payment':
      return { stageKey: 'awaiting_payment', stageLabel: '待支付' };
    case 'paid_pending_start':
    case 'escrowed':
    case 'in_development':
      return { stageKey: 'in_delivery', stageLabel: '待提交交付' };
    case 'revision':
      return { stageKey: 'in_delivery', stageLabel: '需修改' };
    case 'in_review':
      // 买家侧不暴露「平台审核中」，并入「待提交交付」；专家端仍单独展示
      if (audience === 'buyer') {
        return { stageKey: 'in_delivery', stageLabel: '待提交交付' };
      }
      return { stageKey: 'in_review', stageLabel: '平台审核中' };
    case 'pending_acceptance':
      return { stageKey: 'pending_acceptance', stageLabel: '待验收' };
    case 'completed':
    case 'pending_settlement':
      return { stageKey: 'completed', stageLabel: '已完成' };
    case 'dispute':
      return { stageKey: 'dispute', stageLabel: '已关闭/争议中' };
    case 'closed':
      return { stageKey: 'closed', stageLabel: '已关闭/争议中' };
    default:
      return { stageKey: 'unknown', stageLabel: order.status || '—' };
  }
}

function computeStageFromLead(
  lead: { status: string }
): { stageKey: DealStageKey; stageLabel: string } {
  switch (lead.status) {
    case 'new':
    case 'contacted':
      return { stageKey: 'consulting', stageLabel: '咨询中' };
    case 'quoted':
      return { stageKey: 'awaiting_proposal_confirm', stageLabel: '待确认方案' };
    case 'signed':
      return { stageKey: 'awaiting_payment', stageLabel: '待支付' };
    case 'closed':
    default:
      return { stageKey: 'closed', stageLabel: '已关闭/争议中' };
  }
}

function dealFromLead(lead: any, order: any | null, audience: 'buyer' | 'creator' = 'creator') {
  const mappedOrder = order ? mapOrder(order) : null;
  const stage = mappedOrder
    ? computeStageFromOrder(mappedOrder, audience)
    : computeStageFromLead(lead);
  const payload = parseJson(lead.payload, {});
  return {
    dealId: lead.id,
    leadId: lead.id,
    orderId: mappedOrder?.id ?? null,
    stageKey: stage.stageKey,
    stageLabel: stage.stageLabel,
    clientName: lead.clientName,
    clientCompany: lead.clientCompany,
    clientAvatar: lead.clientAvatar,
    agentId: lead.agentId,
    agentTitle: lead.agentTitle,
    standardVersionAtRequest: leadPayloadStandardVersion(payload),
    requirement: lead.notes || lead.summary || '',
    leadStatus: lead.status,
    consultedAt: lead.createdAt,
    order: mappedOrder
  };
}

function dealFromOrphanOrder(order: any, audience: 'buyer' | 'creator' = 'creator') {
  const mappedOrder = mapOrder(order);
  const stage = computeStageFromOrder(mappedOrder, audience);
  return {
    dealId: mappedOrder.id,
    leadId: mappedOrder.leadId || null,
    orderId: mappedOrder.id,
    stageKey: stage.stageKey,
    stageLabel: stage.stageLabel,
    clientName: mappedOrder.buyer?.name || '',
    clientCompany: '',
    clientAvatar: '',
    agentId: mappedOrder.baseAgentId,
    agentTitle: mappedOrder.baseAgentTitle,
    standardVersionAtRequest: mappedOrder.baseAgentVersion,
    requirement: mappedOrder.title || mappedOrder.serviceScope || '',
    leadStatus: undefined,
    consultedAt: mappedOrder.createdAt,
    order: mappedOrder
  };
}

const ORDER_INCLUDE = {
  creator: { select: { id: true, name: true, email: true } },
  buyer: { select: { id: true, name: true, email: true } },
  instance: true,
  deliveries: { orderBy: { createdAt: 'desc' as const }, take: 5 }
};

function mapLeadMessages(lead: { messages?: Array<{ id: string; sender: string; senderName: string; text: string; createdAt: Date }> } | null) {
  return (lead?.messages || []).map((m) => ({
    id: m.id,
    sender: m.sender,
    senderName: m.senderName,
    text: m.text,
    createdAt: m.createdAt
  }));
}

function newMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadDealParts(dealId: string) {
  let lead = await prisma.consultationLead.findUnique({
    where: { id: dealId },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });
  let order = lead
    ? await prisma.customOrder.findFirst({
        where: { leadId: lead.id },
        include: ORDER_INCLUDE
      })
    : await prisma.customOrder.findUnique({
        where: { id: dealId },
        include: ORDER_INCLUDE
      });
  if (!lead && order?.leadId) {
    lead = await prisma.consultationLead.findUnique({
      where: { id: order.leadId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }
  return { lead, order };
}

async function resolveAudience(
  userId: string,
  lead: { userId?: string | null; expertId?: string | null } | null,
  order: { buyerUserId?: string; creatorUserId?: string | null; status?: string } | null
): Promise<'buyer' | 'creator' | null> {
  const expert = await prisma.expert.findFirst({ where: { userId }, select: { id: true } });
  const isBuyer = Boolean((lead && lead.userId === userId) || (order && order.buyerUserId === userId));
  const isCreator = Boolean(
    (lead && expert && lead.expertId === expert.id) ||
      (order &&
        (order.creatorUserId === userId ||
          (order.creatorUserId == null && ['consulting', 'pending_quote'].includes(order.status || ''))))
  );
  if (isCreator && !isBuyer) return 'creator';
  if (isBuyer && !isCreator) return 'buyer';
  if (isCreator && isBuyer) {
    return expert && lead?.expertId === expert.id ? 'creator' : 'buyer';
  }
  return null;
}

async function enrichDeal(
  lead: any,
  order: any,
  audience: 'buyer' | 'creator'
) {
  const deal = lead ? dealFromLead(lead, order, audience) : dealFromOrphanOrder(order, audience);
  let expertName = order?.creator?.name || '';
  if (!expertName && lead?.expertId) {
    const expert = await prisma.expert.findUnique({
      where: { id: lead.expertId },
      select: { name: true }
    });
    expertName = expert?.name || '';
  }
  return {
    ...deal,
    audience,
    expertName,
    contacted: Boolean(lead && lead.status !== 'new'),
    messages: mapLeadMessages(lead)
  };
}

async function counterpartUserId(
  audience: 'buyer' | 'creator',
  lead: { userId?: string | null; expertId?: string | null } | null,
  order: { buyerUserId?: string; creatorUserId?: string | null } | null
) {
  if (audience === 'buyer') {
    return order?.creatorUserId || (await resolveExpertUserId(lead?.expertId));
  }
  return lead?.userId || order?.buyerUserId || null;
}

customServicesRouter.get('/mine', async (req, res) => {
  try {
    const leads = await prisma.consultationLead.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    const orders = await prisma.customOrder.findMany({
      where: { buyerUserId: req.user!.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        instance: true,
        deliveries: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    const orderByLeadId = new Map<string, any>();
    const orphanOrders: any[] = [];
    orders.forEach((o) => {
      if (o.leadId) orderByLeadId.set(o.leadId, o);
      else orphanOrders.push(o);
    });

    const deals = [
      ...leads.map((lead) => dealFromLead(lead, orderByLeadId.get(lead.id), 'buyer')),
      ...orphanOrders.map((o) => dealFromOrphanOrder(o, 'buyer'))
    ];

    return ok(res, deals);
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '加载定制服务失败');
  }
});

customServicesRouter.get('/creator', async (req, res) => {
  try {
    const expert = await prisma.expert.findFirst({ where: { userId: req.user!.id } });

    // 关键：先按创作者拿到 CustomOrder（只要有 leadId 就能串联咨询线索），
    // 避免历史数据里 ConsultationLead.expertId 为空导致 join 失败。
    const orders = await prisma.customOrder.findMany({
      where: {
        OR: [
          { creatorUserId: req.user!.id },
          { creatorUserId: null, status: { in: ['consulting', 'pending_quote'] } }
        ]
      },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        instance: true,
        deliveries: { orderBy: { createdAt: 'desc' }, take: 8 }
      }
    });

    const leadIdsFromOrders = Array.from(
      new Set(orders.map((o) => (o.leadId ? o.leadId : null)).filter(Boolean) as string[])
    );

    const leadsFromOrders = leadIdsFromOrders.length
      ? await prisma.consultationLead.findMany({
          where: { id: { in: leadIdsFromOrders } },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    const leadsFromExpert = expert
      ? await prisma.consultationLead.findMany({
          where: { expertId: expert.id },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    const leadById = new Map<string, any>();
    [...leadsFromExpert, ...leadsFromOrders].forEach((l) => {
      leadById.set(l.id, l);
    });
    const leads = Array.from(leadById.values()).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const orderByLeadId = new Map<string, any>();
    orders.forEach((o) => {
      if (o.leadId) orderByLeadId.set(o.leadId, o);
    });

    const deals = [
      ...leads.map((lead: any) => dealFromLead(lead, orderByLeadId.get(lead.id), 'creator')),
      ...orders
        .filter((o) => !o.leadId || !leadById.has(o.leadId))
        .map((o) => dealFromOrphanOrder(o, 'creator'))
    ];

    return ok(res, deals);
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '加载定制服务失败');
  }
});

const CONSULTING_ORDER_STATUSES = ['consulting', 'pending_quote'];

customServicesRouter.get('/:dealId', async (req, res) => {
  try {
    const { lead, order } = await loadDealParts(req.params.dealId);
    if (!lead && !order) return fail(res, '记录不存在', 404);
    const audience = await resolveAudience(req.user!.id, lead, order);
    if (!audience) return fail(res, '无权查看该咨询', 403);
    return ok(res, await enrichDeal(lead, order, audience));
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '加载咨询失败');
  }
});

customServicesRouter.post('/:dealId/contact', async (req, res) => {
  try {
    const { lead, order } = await loadDealParts(req.params.dealId);
    if (!lead && !order) return fail(res, '记录不存在', 404);
    const audience = await resolveAudience(req.user!.id, lead, order);
    if (!audience) return fail(res, '无权操作该咨询', 403);
    const orderStatus = order?.status;
    if (order && !CONSULTING_ORDER_STATUSES.includes(orderStatus || '') && orderStatus !== 'awaiting_proposal_confirm') {
      return fail(res, '当前阶段请到「我的定制」继续跟进', 400);
    }

    if (lead && lead.status === 'new') {
      await prisma.consultationLead.update({
        where: { id: lead.id },
        data: { status: 'contacted' }
      });
    }

    const otherId = await counterpartUserId(audience, lead, order);
    if (otherId && otherId !== req.user!.id) {
      const dealId = lead?.id || order?.id;
      await notifyUser({
        userId: otherId,
        type: 'consult_contacted',
        title: audience === 'buyer' ? '客户已跟进咨询' : '创作者已接手咨询',
        body: lead?.agentTitle || order?.title || '定制咨询',
        link: `/consult?dealId=${dealId}`,
        payload: { dealId, leadId: lead?.id, orderId: order?.id }
      });
    }

    const next = await loadDealParts(req.params.dealId);
    return ok(res, await enrichDeal(next.lead, next.order, audience));
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '操作失败');
  }
});

customServicesRouter.post('/:dealId/messages', async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) return fail(res, '请填写消息内容');
    const { lead, order } = await loadDealParts(req.params.dealId);
    if (!lead) return fail(res, '该咨询暂不支持留言', 400);
    const audience = await resolveAudience(req.user!.id, lead, order);
    if (!audience) return fail(res, '无权发送消息', 403);
    if (lead.status === 'closed') return fail(res, '咨询已关闭');

    if (lead.status === 'new') {
      await prisma.consultationLead.update({
        where: { id: lead.id },
        data: { status: 'contacted' }
      });
    }

    await prisma.consultationMessage.create({
      data: {
        id: newMessageId(),
        leadId: lead.id,
        sender: audience === 'creator' ? 'creator' : 'user',
        senderName: req.user!.name || (audience === 'creator' ? '创作者' : '客户'),
        text
      }
    });

    const otherId = await counterpartUserId(audience, lead, order);
    if (otherId && otherId !== req.user!.id) {
      await notifyUser({
        userId: otherId,
        type: 'consult_replied',
        title: audience === 'buyer' ? '客户回复了咨询' : '创作者回复了你的咨询',
        body: text.slice(0, 80),
        link: `/consult?dealId=${lead.id}`,
        payload: { dealId: lead.id, leadId: lead.id, orderId: order?.id }
      });
    }

    const next = await loadDealParts(lead.id);
    return ok(res, await enrichDeal(next.lead, next.order, audience), 201);
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '发送失败');
  }
});

customServicesRouter.post('/:dealId/close', async (req, res) => {
  try {
    const dealId = req.params.dealId;
    const { lead, order: relatedOrder } = await loadDealParts(dealId);
    if (!lead && !relatedOrder) return fail(res, '记录不存在', 404);

    const audience = await resolveAudience(req.user!.id, lead, relatedOrder);
    if (!audience) return fail(res, '无权关闭该咨询', 403);

    const orderStatus = relatedOrder?.status;
    if (relatedOrder && !CONSULTING_ORDER_STATUSES.includes(orderStatus || '')) {
      return fail(res, '当前阶段已无法关闭咨询，请走订单流程');
    }

    if (lead) {
      await prisma.consultationLead.update({
        where: { id: lead.id },
        data: { status: 'closed' }
      });
    }
    const closeReason = audience === 'buyer' ? 'buyer_closed_consulting' : 'creator_closed_consulting';
    if (relatedOrder && CONSULTING_ORDER_STATUSES.includes(relatedOrder.status)) {
      await prisma.customOrder.update({
        where: { id: relatedOrder.id },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closeReason
        }
      });
    }

    const otherId = await counterpartUserId(audience, lead, relatedOrder);
    if (otherId && otherId !== req.user!.id) {
      const notifyDealId = lead?.id || relatedOrder?.id;
      await notifyUser({
        userId: otherId,
        type: 'consult_closed',
        title: audience === 'buyer' ? '客户已关闭咨询' : '创作者已关闭咨询',
        body: lead?.agentTitle || relatedOrder?.title || '',
        link: `/consult?dealId=${notifyDealId}`,
        payload: { dealId: notifyDealId, leadId: lead?.id, orderId: relatedOrder?.id }
      });
    }

    return ok(res, { closed: true });
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '关闭失败');
  }
});

export { customServicesRouter };

