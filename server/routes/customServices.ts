import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { parseJson } from '../lib/json';
import { requireAuth } from '../middleware/auth';
import { mapOrder } from '../services/customOrder';

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

function computeStageFromOrder(order: any): { stageKey: DealStageKey; stageLabel: string } {
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
    case 'revision':
      return { stageKey: 'in_delivery', stageLabel: '交付中' };
    case 'in_review':
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

function dealFromLead(lead: any, order: any | null) {
  const mappedOrder = order ? mapOrder(order) : null;
  const stage = mappedOrder ? computeStageFromOrder(mappedOrder) : computeStageFromLead(lead);
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

function dealFromOrphanOrder(order: any) {
  const mappedOrder = mapOrder(order);
  const stage = computeStageFromOrder(mappedOrder);
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
      ...leads.map((lead) => dealFromLead(lead, orderByLeadId.get(lead.id))),
      ...orphanOrders.map(dealFromOrphanOrder)
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
      ...leads.map((lead: any) => dealFromLead(lead, orderByLeadId.get(lead.id))),
      ...orders.filter((o) => !o.leadId || !leadById.has(o.leadId)).map(dealFromOrphanOrder)
    ];

    return ok(res, deals);
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '加载定制服务失败');
  }
});

const CONSULTING_ORDER_STATUSES = ['consulting', 'pending_quote'];

customServicesRouter.post('/:dealId/close', async (req, res) => {
  try {
    const dealId = req.params.dealId;
    const expert = await prisma.expert.findFirst({ where: { userId: req.user!.id } });
    const lead = await prisma.consultationLead.findUnique({ where: { id: dealId } });
    const relatedOrder = lead
      ? await prisma.customOrder.findFirst({ where: { leadId: lead.id } })
      : await prisma.customOrder.findUnique({ where: { id: dealId } });

    if (!lead && !relatedOrder) return fail(res, '记录不存在', 404);

    const ownsLead = Boolean(lead && expert && lead.expertId === expert.id);
    const ownsOrder = Boolean(
      relatedOrder &&
        (relatedOrder.creatorUserId === req.user!.id ||
          relatedOrder.creatorUserId == null)
    );
    if (!ownsLead && !ownsOrder) return fail(res, '无权关闭该咨询', 403);

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
    if (relatedOrder && CONSULTING_ORDER_STATUSES.includes(relatedOrder.status)) {
      await prisma.customOrder.update({
        where: { id: relatedOrder.id },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closeReason: 'creator_closed_consulting'
        }
      });
    }

    return ok(res, { closed: true });
  } catch (e) {
    return fail(res, e instanceof Error ? e.message : '关闭失败');
  }
});

export { customServicesRouter };

