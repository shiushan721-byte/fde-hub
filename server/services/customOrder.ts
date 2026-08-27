import { prisma } from '../lib/prisma';
import { toJson, parseJson } from '../lib/json';
import { runHermesValidation } from '../adapters/hermes';
import { stubPaymentAdapter } from '../adapters/payment';
import { writeAudit } from '../lib/audit';
import { creditCreatorPendingIncome, reverseCreatorPendingIncome, type PayChannel } from './wallet';
import { createPendingPayment, markPaymentPaid } from './payments';

export function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newOrderNo() {
  const y = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `CUS-${y}-${seq}`;
}

async function writeOrderEvent(input: {
  orderId: string;
  actorId?: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  payload?: unknown;
}) {
  await prisma.customOrderEvent.create({
    data: {
      id: newId('oevt'),
      orderId: input.orderId,
      actorId: input.actorId,
      eventType: input.eventType,
      fromStatus: input.fromStatus || '',
      toStatus: input.toStatus || '',
      reason: input.reason || '',
      payload: toJson(input.payload ?? {})
    }
  });
}

async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  payload?: unknown;
}) {
  await prisma.userNotification.create({
    data: {
      id: newId('ntf'),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body || '',
      link: input.link || '',
      payload: toJson(input.payload ?? {})
    }
  });
}

export function mapOrder(order: any) {
  const legacyStatus =
    order.status === 'pending_quote'
      ? 'consulting'
      : order.status === 'escrowed'
        ? 'paid_pending_start'
        : order.status;

  return {
    ...order,
    status: legacyStatus,
    customizationSpec: parseJson(order.customizationSpec, {}),
    deliveryProposal: parseJson(order.deliveryProposal, {}),
    instance: order.instance
      ? {
          ...order.instance,
          customizationSpec: parseJson(order.instance.customizationSpec, {})
        }
      : null,
    deliveries: (order.deliveries || []).map((d: any) => ({
      ...d,
      completedItems: parseJson(d.completedItems, []),
      skillPayload: parseJson(d.skillPayload, {}),
      hermesReport: parseJson(d.hermesReport, {})
    }))
  };
}

export async function createCustomOrder(input: {
  buyerUserId: string;
  expertId?: string;
  creatorUserId?: string;
  baseAgentId: string;
  baseAgentTitle: string;
  baseAgentVersion?: string;
  title: string;
  customizationSpec: unknown;
  priceCents?: number;
  deliveryDays?: number;
  serviceScope?: string;
  leadId?: string;
}) {
  const base = await prisma.agent.findUnique({ where: { id: input.baseAgentId } });
  if (!base || base.status !== 'published') {
    throw new Error('基础智能体不存在或未上架，无法创建定制订单');
  }

  let creatorUserId = input.creatorUserId;
  if (!creatorUserId && input.expertId) {
    const expert = await prisma.expert.findUnique({ where: { id: input.expertId } });
    creatorUserId = expert?.userId || undefined;
  }

  const order = await prisma.customOrder.create({
    data: {
      id: newId('cord'),
      orderNo: newOrderNo(),
      status: 'consulting',
      buyerUserId: input.buyerUserId,
      creatorUserId,
      expertId: input.expertId,
      baseAgentId: input.baseAgentId,
      baseAgentTitle: input.baseAgentTitle || base.title,
      baseAgentVersion: input.baseAgentVersion || 'v1.0.0',
      title: input.title,
      customizationSpec: toJson(input.customizationSpec ?? {}),
      priceCents: input.priceCents || 0,
      deliveryDays: input.deliveryDays || 14,
      serviceScope: input.serviceScope || '',
      paymentStatus: 'none',
      leadId: input.leadId
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.buyerUserId,
    eventType: 'order_created',
    toStatus: 'consulting',
    payload: {
      baseAgentId: order.baseAgentId,
      baseAgentVersion: order.baseAgentVersion
    }
  });

  if (creatorUserId) {
    await notify({
      userId: creatorUserId,
      type: 'custom_order_pending_quote',
      title: '新的定制订单待报价',
      body: `${order.orderNo} · ${order.title}`,
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id }
    });
  }

  return order;
}

const DEMO_BUYER_EMAIL = 'user@hellome.art';

/** 创作者从咨询线索创建交付订单（咨询阶段） */
export async function createCustomOrderFromLeadForCreator(input: {
  leadId: string;
  creatorUserId: string;
  fallback?: {
    clientName?: string;
    clientCompany?: string;
    agentId: string;
    agentTitle: string;
    baseAgentVersion?: string;
    customizationSummary?: string;
    notes?: string;
    expertId?: string;
  };
}) {
  const existing = await prisma.customOrder.findFirst({ where: { leadId: input.leadId } });
  if (existing) throw new Error('该线索已有关联交付订单');

  let lead = await prisma.consultationLead.findUnique({ where: { id: input.leadId } });

  if (!lead) {
    if (!input.fallback?.agentId) throw new Error('咨询线索不存在');
    const demoBuyer = await prisma.user.findUnique({ where: { email: DEMO_BUYER_EMAIL } });
    lead = await prisma.consultationLead.create({
      data: {
        id: input.leadId,
        clientName: input.fallback.clientName || '企业客户',
        clientCompany: input.fallback.clientCompany || '',
        agentId: input.fallback.agentId,
        agentTitle: input.fallback.agentTitle,
        summary: input.fallback.customizationSummary || input.fallback.notes || '',
        notes: input.fallback.notes || '',
        expertId: input.fallback.expertId,
        userId: demoBuyer?.id,
        payload: toJson(input.fallback)
      }
    });
  }

  let buyerUserId = lead.userId;
  if (!buyerUserId) {
    const demoBuyer = await prisma.user.findUnique({ where: { email: DEMO_BUYER_EMAIL } });
    if (!demoBuyer) throw new Error('无法确定买家账号，请让客户先登录后再创建订单');
    buyerUserId = demoBuyer.id;
  }

  let baseAgentId = lead.agentId || input.fallback?.agentId;
  if (!baseAgentId) throw new Error('缺少基础智能体信息');

  let base = await prisma.agent.findUnique({ where: { id: baseAgentId } });
  if (!base || base.status !== 'published') {
    const titleHint = (lead.agentTitle || input.fallback?.agentTitle || '').slice(0, 12);
    base =
      (titleHint
        ? await prisma.agent.findFirst({
            where: { title: { contains: titleHint }, status: 'published' }
          })
        : null) ||
      (await prisma.agent.findFirst({ where: { status: 'published' }, orderBy: { sortOrder: 'asc' } }));
    if (base) baseAgentId = base.id;
  }
  if (!base) throw new Error('无可用基础智能体，请先上架对应智能体');

  const expert = await prisma.expert.findFirst({ where: { userId: input.creatorUserId } });
  const payload = parseJson(lead.payload, {}) as Record<string, unknown>;
  const customizationSpec =
    payload.customizationSpec ??
    (lead.summary || lead.notes
      ? { summary: lead.summary, notes: lead.notes, customizationSummary: input.fallback?.customizationSummary }
      : {});

  return createCustomOrder({
    buyerUserId,
    creatorUserId: input.creatorUserId,
    expertId: lead.expertId || expert?.id,
    baseAgentId,
    baseAgentTitle: lead.agentTitle || base.title,
    baseAgentVersion:
      input.fallback?.baseAgentVersion ||
      (typeof payload.baseAgentVersion === 'string' ? payload.baseAgentVersion : undefined) ||
      'v1.0.0',
    title: `定制 · ${lead.clientCompany || lead.clientName} · ${lead.agentTitle || base.title}`,
    customizationSpec,
    serviceScope: lead.summary || lead.notes || input.fallback?.customizationSummary || '',
    leadId: lead.id
  });
}

/** 创作者发起定制交付方案 */
export async function submitDeliveryProposal(input: {
  orderId: string;
  creatorUserId: string;
  proposal: {
    baseAgentId?: string;
    baseAgentTitle?: string;
    baseAgentVersion?: string;
    customizationItems: string[];
    excludedItems?: string[];
    deliverables: string[];
    priceCents: number;
    deliveryDays: number;
    freeRevisionCount?: number;
    acceptanceCriteria: string;
    afterSalePeriodDays?: number;
    needsCustomerData?: boolean;
    customerDataNote?: string;
    needsThirdPartyAccess?: boolean;
    thirdPartyNote?: string;
    note?: string;
  };
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (!['consulting', 'pending_quote', 'revision'].includes(order.status)) {
    throw new Error('当前状态不可发起交付方案');
  }
  if (order.creatorUserId && order.creatorUserId !== input.creatorUserId) {
    throw new Error('仅负责该咨询的创作者可发起方案');
  }
  if (input.proposal.priceCents <= 0) throw new Error('交付价格须大于 0');
  if (input.proposal.deliveryDays <= 0) throw new Error('预计交付时间须大于 0');
  if (!input.proposal.customizationItems.length) throw new Error('请填写定制需求清单');
  if (!input.proposal.deliverables.length) throw new Error('请填写交付成果');
  if (!input.proposal.acceptanceCriteria.trim()) throw new Error('请填写验收标准');

  const version = order.proposalVersion + 1;
  const proposal = {
    baseAgentId: input.proposal.baseAgentId || order.baseAgentId,
    baseAgentTitle: input.proposal.baseAgentTitle || order.baseAgentTitle,
    baseAgentVersion: input.proposal.baseAgentVersion || order.baseAgentVersion,
    customizationItems: input.proposal.customizationItems,
    excludedItems: input.proposal.excludedItems || [],
    deliverables: input.proposal.deliverables,
    priceCents: input.proposal.priceCents,
    deliveryDays: input.proposal.deliveryDays,
    freeRevisionCount: input.proposal.freeRevisionCount ?? 2,
    acceptanceCriteria: input.proposal.acceptanceCriteria,
    afterSalePeriodDays: input.proposal.afterSalePeriodDays ?? 30,
    needsCustomerData: Boolean(input.proposal.needsCustomerData),
    customerDataNote: input.proposal.customerDataNote,
    needsThirdPartyAccess: Boolean(input.proposal.needsThirdPartyAccess),
    thirdPartyNote: input.proposal.thirdPartyNote,
    note: input.proposal.note,
    submittedAt: new Date().toISOString(),
    version
  };

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      status: 'awaiting_proposal_confirm',
      creatorUserId: input.creatorUserId,
      deliveryProposal: toJson(proposal),
      proposalVersion: version,
      proposalSubmittedAt: new Date(),
      proposalConfirmedAt: null,
      priceCents: input.proposal.priceCents,
      deliveryDays: input.proposal.deliveryDays,
      revisionQuota: proposal.freeRevisionCount,
      serviceScope: input.proposal.deliverables.join('；'),
      quoteNote: input.proposal.note || '',
      quotedAt: new Date()
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.creatorUserId,
    eventType: 'delivery_proposal_submitted',
    fromStatus: order.status,
    toStatus: 'awaiting_proposal_confirm',
    payload: { proposalVersion: version, priceCents: input.proposal.priceCents }
  });

  await notify({
    userId: order.buyerUserId,
    type: 'delivery_proposal_ready',
    title: '创作者已发起定制交付方案，请确认',
    body: `${order.orderNo} · ¥${(input.proposal.priceCents / 100).toFixed(2)} · ${input.proposal.deliveryDays} 天`,
    link: `/orders?orderId=${order.id}`,
    payload: { orderId: order.id, proposalVersion: version }
  });

  return updated;
}

/** @deprecated 使用 submitDeliveryProposal */
export async function submitQuote(input: {
  orderId: string;
  creatorUserId: string;
  priceCents: number;
  deliveryDays: number;
  serviceScope: string;
  quoteNote?: string;
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  const spec = parseJson(order.customizationSpec, {}) as { unsatisfiedAreas?: string };
  return submitDeliveryProposal({
    orderId: input.orderId,
    creatorUserId: input.creatorUserId,
    proposal: {
      customizationItems: spec.unsatisfiedAreas
        ? [spec.unsatisfiedAreas]
        : input.serviceScope.split(/[；;]/).filter(Boolean),
      excludedItems: [],
      deliverables: input.serviceScope.split(/[；;]/).filter(Boolean).length
        ? input.serviceScope.split(/[；;]/).filter(Boolean)
        : [input.serviceScope],
      priceCents: input.priceCents,
      deliveryDays: input.deliveryDays,
      acceptanceCriteria: '按方案交付成果逐项验收，功能可正常使用',
      note: input.quoteNote
    }
  });
}

/** 用户确认交付方案 → 生成待支付订单 */
export async function confirmProposalByBuyer(input: {
  orderId: string;
  buyerUserId: string;
  ackEscrowRules?: boolean;
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.buyerUserId !== input.buyerUserId) throw new Error('仅下单用户可确认方案');
  if (order.status !== 'awaiting_proposal_confirm') throw new Error('当前无可确认的方案');

  const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      status: 'awaiting_payment',
      proposalConfirmedAt: new Date(),
      paymentDeadlineAt: deadline
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.buyerUserId,
    eventType: 'proposal_confirmed',
    fromStatus: 'awaiting_proposal_confirm',
    toStatus: 'awaiting_payment',
    payload: { paymentDeadlineAt: deadline.toISOString() }
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'proposal_confirmed',
      title: '用户已确认交付方案，等待付款',
      body: order.orderNo,
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id }
    });
  }

  return updated;
}

/** 用户拒绝交付方案 */
export async function rejectProposalByBuyer(input: {
  orderId: string;
  buyerUserId: string;
  reason?: string;
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.buyerUserId !== input.buyerUserId) throw new Error('仅下单用户可操作');
  if (order.status !== 'awaiting_proposal_confirm') throw new Error('当前无可拒绝的方案');

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: { status: 'consulting' }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.buyerUserId,
    eventType: 'proposal_rejected',
    fromStatus: 'awaiting_proposal_confirm',
    toStatus: 'consulting',
    reason: input.reason || '用户拒绝方案'
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'proposal_rejected',
      title: '用户拒绝了交付方案',
      body: input.reason || '请修改后重新发起',
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id }
    });
  }

  return updated;
}

/** 用户要求修改交付方案 */
export async function requestProposalRevisionByBuyer(input: {
  orderId: string;
  buyerUserId: string;
  feedback: string;
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.buyerUserId !== input.buyerUserId) throw new Error('仅下单用户可操作');
  if (order.status !== 'awaiting_proposal_confirm') throw new Error('当前状态不可要求修改方案');

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: { status: 'consulting' }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.buyerUserId,
    eventType: 'proposal_revision_requested',
    fromStatus: 'awaiting_proposal_confirm',
    toStatus: 'consulting',
    reason: input.feedback
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'proposal_revision_requested',
      title: '用户要求修改交付方案',
      body: input.feedback,
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id }
    });
  }

  return updated;
}

/** 用户发起托管付款（钱进平台，未到账前创作者不可开发） */
export async function initiatePayment(input: {
  orderId: string;
  buyerUserId: string;
  channel?: PayChannel;
}) {
  const channel: PayChannel = input.channel === 'alipay' ? 'alipay' : 'wechat';
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.buyerUserId !== input.buyerUserId) throw new Error('仅下单用户可付款');
  if (order.status !== 'awaiting_payment') throw new Error('当前状态不可付款');
  if (!order.proposalConfirmedAt) throw new Error('请先确认交付方案后再付款');
  if (order.priceCents <= 0) throw new Error('订单尚未定价');
  if (order.paymentDeadlineAt && order.paymentDeadlineAt < new Date()) {
    await prisma.customOrder.update({
      where: { id: order.id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closeReason: 'payment_timeout',
        paymentStatus: order.paymentStatus === 'pending' ? 'expired' : order.paymentStatus
      }
    });
    throw new Error('订单已超时关闭，请重新发起方案');
  }

  const record = await createPendingPayment({
    orderId: order.id,
    userId: input.buyerUserId,
    amountCents: order.priceCents,
    channel,
    currency: order.currency
  });

  const stub = await stubPaymentAdapter.createPayment({
    orderId: order.id,
    amount: order.priceCents / 100,
    currency: order.currency,
    description: `定制订单 ${order.orderNo} 托管付款`,
    channel
  });

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      paymentId: record.id,
      paymentChannel: channel,
      paymentStatus: 'pending',
      paidAt: null
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.buyerUserId,
    eventType: 'payment_initiated',
    fromStatus: 'awaiting_payment',
    toStatus: 'awaiting_payment',
    payload: {
      paymentId: record.id,
      channel,
      checkoutCode: record.checkoutCode,
      checkoutUrl: stub.checkoutUrl
    }
  });

  return {
    order: updated,
    payment: {
      paymentId: record.id,
      status: record.status,
      channel,
      amountCents: record.amountCents,
      checkoutCode: record.checkoutCode,
      checkoutUrl: stub.checkoutUrl
    }
  };
}

/**
 * 确认平台到账（演示：用户一键模拟支付成功；生产应由支付回调触发）
 * 到账后订单进入 escrowed，创作者才可开始开发/交付
 */
export async function confirmEscrow(input: {
  orderId: string;
  actorId: string;
  asAdmin?: boolean;
  channel?: PayChannel;
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'awaiting_payment') throw new Error('当前状态不可确认到账');
  if (!input.asAdmin && order.buyerUserId !== input.actorId) {
    throw new Error('仅下单用户或运营可确认付款');
  }

  const channel: PayChannel =
    input.channel === 'alipay' || input.channel === 'wechat'
      ? input.channel
      : order.paymentChannel === 'alipay'
        ? 'alipay'
        : 'wechat';

  let paymentId = order.paymentId;
  if (!paymentId) {
    const record = await createPendingPayment({
      orderId: order.id,
      userId: order.buyerUserId,
      amountCents: order.priceCents,
      channel,
      currency: order.currency
    });
    paymentId = record.id;
  }

  await stubPaymentAdapter.confirmPaid(paymentId);
  await markPaymentPaid(paymentId).catch(() => undefined);
  const now = new Date();

  if (!order.creatorUserId) throw new Error('订单未指定创作者');

  const instance = await ensurePrivateInstance(order, order.creatorUserId);

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      status: 'paid_pending_start',
      paymentId,
      paymentChannel: channel,
      paymentStatus: 'escrowed',
      paidAt: now,
      escrowedAt: now,
      instanceId: instance.id
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.actorId,
    eventType: 'payment_escrowed',
    fromStatus: 'awaiting_payment',
    toStatus: 'paid_pending_start',
    payload: { paymentId, amountCents: order.priceCents, instanceId: instance.id, channel }
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'custom_order_escrowed',
      title: '平台已托管到账，请开始开发',
      body: `${order.orderNo} · ¥${(order.priceCents / 100).toFixed(2)} 已托管 · 专属实例已创建`,
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id, instanceId: instance.id }
    });
  }

  return updated;
}

/** 提交交付时按需分叉客户专属实例（与发布智能体同一交付链路，无单独「开始开发」步骤） */
async function ensurePrivateInstance(order: {
  id: string;
  buyerUserId: string;
  expertId: string | null;
  baseAgentId: string;
  baseAgentTitle: string;
  baseAgentVersion: string;
  customizationSpec: string;
  instanceId: string | null;
}, creatorUserId: string) {
  if (order.instanceId) {
    const existing = await prisma.privateAgentInstance.findUnique({ where: { id: order.instanceId } });
    if (existing) return existing;
  }

  const instanceId = newId('inst');
  const instance = await prisma.privateAgentInstance.create({
    data: {
      id: instanceId,
      orderId: order.id,
      customerUserId: order.buyerUserId,
      creatorUserId,
      expertId: order.expertId,
      baseAgentId: order.baseAgentId,
      baseAgentTitle: order.baseAgentTitle,
      baseAgentVersion: order.baseAgentVersion,
      title: `${order.baseAgentTitle} · 客户专属`,
      currentVersion: '',
      status: 'draft',
      visibility: 'customer_only',
      customizationSpec: order.customizationSpec
    }
  });

  await prisma.customOrder.update({
    where: { id: order.id },
    data: { instanceId: instance.id, creatorUserId }
  });

  return instance;
}

/** 创作者确认开工 → 开发中 */
export async function startDevelopment(orderId: string, creatorUserId: string) {
  const order = await prisma.customOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.creatorUserId !== creatorUserId) throw new Error('仅接单创作者可开工');
  if (!['paid_pending_start', 'escrowed'].includes(order.status)) {
    throw new Error('当前状态不可开工');
  }
  if (order.paymentStatus !== 'escrowed') throw new Error('平台未确认托管到账');

  const instance = await ensurePrivateInstance(order, creatorUserId);

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: { status: 'in_development', instanceId: instance.id }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: creatorUserId,
    eventType: 'development_started',
    fromStatus: order.status,
    toStatus: 'in_development',
    payload: { instanceId: instance.id }
  });

  return { order: updated, instance };
}

/** @deprecated 保留别名 */
export async function acceptOrder(orderId: string, creatorUserId: string) {
  return startDevelopment(orderId, creatorUserId);
}

/** 提交交付审核：上传 Skill → Hermes 校验 → 进运营审核（与发布智能体同一流程） */
export async function submitDelivery(input: {
  orderId: string;
  creatorUserId: string;
  version: string;
  changelog: string;
  completedItems?: string[];
  skillPayload?: unknown;
}) {
  let order = await prisma.customOrder.findUnique({
    where: { id: input.orderId },
    include: { instance: true }
  });
  if (!order) throw new Error('订单不存在');
  if (order.creatorUserId && order.creatorUserId !== input.creatorUserId) {
    throw new Error('仅接单创作者可提交交付');
  }
  if (!['paid_pending_start', 'in_development', 'revision', 'escrowed'].includes(order.status)) {
    throw new Error('当前状态不可提交交付审核');
  }
  if (order.paymentStatus !== 'escrowed' && order.paymentStatus !== 'released') {
    throw new Error('平台未确认到账，不可提交正式交付');
  }

  const open = await prisma.deliveryVersion.findFirst({
    where: {
      orderId: order.id,
      status: { in: ['pending_ops_review', 'validating'] }
    }
  });
  if (open) throw new Error('已有进行中的交付审核，请等待处理');

  const instance = await ensurePrivateInstance(order, input.creatorUserId);
  if (order.status === 'paid_pending_start' || order.status === 'escrowed') {
    await prisma.customOrder.update({ where: { id: order.id }, data: { status: 'in_development' } });
    order = { ...order, status: 'in_development', instanceId: instance.id, instance };
  }

  const hermes = await runHermesValidation({
    skillPayload: input.skillPayload,
    title: instance.title
  });

  const delivery = await prisma.deliveryVersion.create({
    data: {
      id: newId('deliv'),
      orderId: order.id,
      instanceId: instance.id,
      version: input.version,
      status: hermes.passed ? 'pending_ops_review' : 'validation_failed',
      changelog: input.changelog,
      completedItems: toJson(input.completedItems || []),
      skillPayload: toJson(input.skillPayload ?? {}),
      hermesReport: toJson(hermes.report),
      hermesPassed: hermes.passed,
      hermesCheckedAt: new Date(),
      submittedAt: hermes.passed ? new Date() : null
    }
  });

  const rollbackStatus = order.status === 'revision' ? 'revision' : 'in_development';

  if (!hermes.passed) {
    await writeOrderEvent({
      orderId: order.id,
      actorId: input.creatorUserId,
      eventType: 'hermes_failed',
      fromStatus: order.status,
      toStatus: rollbackStatus,
      reason: hermes.report.issues.join('；'),
      payload: { deliveryId: delivery.id, version: delivery.version }
    });
    return { delivery, hermes };
  }

  await prisma.customOrder.update({
    where: { id: order.id },
    data: { status: 'in_review', currentDeliveryId: delivery.id }
  });
  await prisma.privateAgentInstance.update({
    where: { id: instance.id },
    data: { status: 'in_review' }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.creatorUserId,
    eventType: 'delivery_submitted',
    fromStatus: order.status,
    toStatus: 'in_review',
    payload: { deliveryId: delivery.id, version: delivery.version }
  });

  return { delivery, hermes };
}

/** 运营审核通过具体交付版本 → 推送给下单用户 */
export async function approveDelivery(input: {
  deliveryId: string;
  reviewerId: string;
}) {
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const delivery = await tx.deliveryVersion.findUnique({ where: { id: input.deliveryId } });
    if (!delivery) throw new Error('交付版本不存在');
    if (delivery.status !== 'pending_ops_review') throw new Error('该版本当前不可审核通过');

    const order = await tx.customOrder.findUnique({ where: { id: delivery.orderId } });
    if (!order) throw new Error('订单不存在');

    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await tx.deliveryVersion.update({
      where: { id: delivery.id },
      data: {
        status: 'published_to_customer',
        reviewerId: input.reviewerId,
        reviewedAt: new Date(),
        publishedAt: new Date(),
        rejectReason: ''
      }
    });

    await tx.privateAgentInstance.update({
      where: { id: delivery.instanceId },
      data: {
        status: 'active',
        currentVersion: delivery.version,
        publishedAt: new Date()
      }
    });

    const updatedOrder = await tx.customOrder.update({
      where: { id: order.id },
      data: {
        status: 'pending_acceptance',
        currentDeliveryId: delivery.id,
        acceptanceDeadlineAt: deadline,
        acceptanceStartedAt: new Date(),
        acceptanceRemindersSent: toJson([]),
        disputeStatus: order.disputeStatus === 'continue_delivery' ? 'none' : order.disputeStatus
      }
    });

    await tx.customOrderEvent.create({
      data: {
        id: newId('oevt'),
        orderId: order.id,
        actorId: input.reviewerId,
        eventType: 'delivery_approved_and_pushed',
        fromStatus: 'in_review',
        toStatus: 'pending_acceptance',
        payload: toJson({
          deliveryId: delivery.id,
          version: delivery.version,
          acceptanceDeadlineAt: deadline.toISOString()
        })
      }
    });

    await tx.userNotification.create({
      data: {
        id: newId('ntf'),
        userId: order.buyerUserId,
        type: 'delivery_ready',
        title: '专属智能体审核已通过',
        body: `${order.title} ${delivery.version} 已通过平台审核并推送到您的工作台，请验收。`,
        link: `/workspace?instanceId=${delivery.instanceId}`,
        payload: toJson({
          orderId: order.id,
          deliveryId: delivery.id,
          version: delivery.version,
          agentTitle: order.title,
          changelog: delivery.changelog,
          acceptanceDeadlineAt: deadline.toISOString()
        })
      }
    });

    if (order.creatorUserId) {
      await tx.userNotification.create({
        data: {
          id: newId('ntf'),
          userId: order.creatorUserId,
          type: 'delivery_review_approved',
          title: '交付智能体审核已通过',
          body: `「${order.title}」${delivery.version} 已通过平台审核，并已推送给客户。`,
          link: `/creator-center?tab=custom-services`,
          payload: toJson({
            orderId: order.id,
            deliveryId: delivery.id,
            version: delivery.version,
            agentTitle: order.title
          })
        }
      });
    }

    await writeAudit({
      actorId: input.reviewerId,
      action: 'approve_delivery_version',
      targetType: 'delivery_version',
      targetId: delivery.id,
      diff: { orderId: order.id, version: delivery.version }
    });

    return updatedOrder;
  });

  if (updatedOrder.creatorUserId) {
    await creditCreatorPendingIncome(updatedOrder.id, updatedOrder.acceptanceStartedAt || new Date());
  }
  return updatedOrder;
}

export async function rejectDelivery(input: {
  deliveryId: string;
  reviewerId: string;
  reason: string;
}) {
  const delivery = await prisma.deliveryVersion.findUnique({ where: { id: input.deliveryId } });
  if (!delivery) throw new Error('交付版本不存在');
  if (delivery.status !== 'pending_ops_review') throw new Error('该版本当前不可驳回');

  const order = await prisma.customOrder.findUnique({ where: { id: delivery.orderId } });
  if (!order) throw new Error('订单不存在');

  await prisma.$transaction(async (tx) => {
    await tx.deliveryVersion.update({
      where: { id: delivery.id },
      data: {
        status: 'ops_rejected',
        reviewerId: input.reviewerId,
        reviewedAt: new Date(),
        rejectReason: input.reason
      }
    });
    await tx.customOrder.update({
      where: { id: order.id },
      data: { status: 'revision' }
    });
    await tx.privateAgentInstance.update({
      where: { id: delivery.instanceId },
      data: { status: 'revision' }
    });
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.reviewerId,
    eventType: 'delivery_rejected',
    fromStatus: 'in_review',
    toStatus: 'revision',
    reason: input.reason,
    payload: { deliveryId: delivery.id, version: delivery.version }
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'delivery_review_rejected',
      title: '交付智能体审核未通过',
      body: `「${order.title}」${delivery.version} 被驳回：${input.reason}`,
      link: `/creator-center?tab=custom-services`,
      payload: {
        orderId: order.id,
        deliveryId: delivery.id,
        reason: input.reason,
        agentTitle: order.title
      }
    });
  }

  await notify({
    userId: order.buyerUserId,
    type: 'delivery_review_rejected',
    title: '专属智能体审核未通过',
    body: `「${order.title}」${delivery.version} 未通过平台审核：${input.reason}`,
    link: `/order-center`,
    payload: {
      orderId: order.id,
      deliveryId: delivery.id,
      reason: input.reason,
      agentTitle: order.title
    }
  });

  await writeAudit({
    actorId: input.reviewerId,
    action: 'reject_delivery_version',
    targetType: 'delivery_version',
    targetId: delivery.id,
    diff: { reason: input.reason }
  });

  return delivery;
}

const PLATFORM_FEE_RATE = 0.1;
const SETTLEMENT_HOLD_MS = 24 * 60 * 60 * 1000;

export async function settleOrder(orderId: string, actorId?: string) {
  const order = await prisma.customOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.settlementStatus === 'settled') return order;
  if (order.disputeStatus === 'open') throw new Error('争议处理中，不可结算');
  if (order.status !== 'pending_settlement' && order.status !== 'completed') {
    throw new Error('订单当前不可结算');
  }
  if (
    order.settlementEligibleAt &&
    order.settlementEligibleAt > new Date() &&
    actorId !== 'ops_force'
  ) {
    throw new Error('订单仍在 24 小时待结算观察期');
  }

  const platformFeeCents =
    order.platformFeeCents > 0
      ? order.platformFeeCents
      : Math.round(order.priceCents * PLATFORM_FEE_RATE);
  const creatorPayoutCents =
    order.creatorPayoutCents > 0
      ? order.creatorPayoutCents
      : Math.max(0, order.priceCents - platformFeeCents);
  const now = new Date();

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      status: 'completed',
      settlementStatus: 'settled',
      paymentStatus: 'settled',
      platformFeeCents,
      creatorPayoutCents,
      settledAt: now
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId,
    eventType: 'order_settled',
    fromStatus: order.status,
    toStatus: 'completed',
    payload: { platformFeeCents, creatorPayoutCents, settledAt: now.toISOString() }
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'order_settled',
      title: '定制订单已完成结算',
      body: `${order.orderNo} · 收益已按 T+7 规则进入可提现（已扣平台服务费）`,
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id, creatorPayoutCents }
    });
  }

  return updated;
}

export async function acceptDeliveryByBuyer(input: {
  orderId: string;
  buyerUserId: string;
  feedback?: string;
  source?: 'buyer' | 'system_auto';
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.buyerUserId !== input.buyerUserId) throw new Error('仅下单用户可验收');
  if (order.status !== 'pending_acceptance') throw new Error('当前状态不可验收');
  if (order.disputeStatus === 'open') throw new Error('争议处理中，不可验收');

  const eligibleAt = new Date(Date.now() + SETTLEMENT_HOLD_MS);
  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      status: 'pending_settlement',
      settlementStatus: 'pending_settlement',
      settlementEligibleAt: eligibleAt
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.source === 'system_auto' ? 'system' : input.buyerUserId,
    eventType: input.source === 'system_auto' ? 'auto_accepted' : 'buyer_accepted',
    fromStatus: 'pending_acceptance',
    toStatus: 'pending_settlement',
    reason:
      input.feedback ||
      (input.source === 'system_auto' ? '七天无异议自动验收' : '验收通过'),
    payload: {
      feedback: input.feedback || '',
      settlementEligibleAt: eligibleAt.toISOString(),
      source: input.source || 'buyer'
    }
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'order_accepted',
      title:
        input.source === 'system_auto'
          ? '订单已自动验收，进入待结算'
          : '客户已验收，进入待结算',
      body: `${order.orderNo} · 约 24 小时后结算`,
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id, settlementEligibleAt: eligibleAt.toISOString() }
    });
  }

  return updated;
}

export async function requestRevisionByBuyer(input: {
  orderId: string;
  buyerUserId: string;
  feedback: string;
  unmetItems?: string[];
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.buyerUserId !== input.buyerUserId) throw new Error('仅下单用户可申请修改');
  if (order.status !== 'pending_acceptance') throw new Error('当前状态不可申请修改');
  if (order.disputeStatus === 'open') throw new Error('争议处理中，请等待平台判定');

  const remainingMs =
    order.acceptanceDeadlineAt && order.acceptanceDeadlineAt > new Date()
      ? order.acceptanceDeadlineAt.getTime() - Date.now()
      : 0;

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      status: 'revision',
      revisionsUsed: order.revisionsUsed + 1,
      acceptanceDeadlineAt: null
    }
  });

  if (order.instanceId) {
    await prisma.privateAgentInstance.update({
      where: { id: order.instanceId },
      data: { status: 'revision' }
    });
  }

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.buyerUserId,
    eventType: 'buyer_requested_revision',
    fromStatus: 'pending_acceptance',
    toStatus: 'revision',
    reason: input.feedback,
    payload: {
      revisionsUsed: updated.revisionsUsed,
      unmetItems: input.unmetItems || [],
      pausedRemainingMs: remainingMs
    }
  });

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'revision_requested',
      title: '客户申请修改交付',
      body:
        (input.unmetItems?.length
          ? `未达标：${input.unmetItems.join('、')}。`
          : '') + input.feedback,
      link: `/creator-center?tab=custom-services`,
      payload: {
        orderId: order.id,
        agentTitle: order.title,
        unmetItems: input.unmetItems || [],
        reason: input.feedback
      }
    });
  }

  if (order.creatorUserId) {
    await reverseCreatorPendingIncome(order.id);
  }

  return updated;
}

/** 用户发起争议：冻结资金与验收倒计时 */
export async function openDisputeByBuyer(input: {
  orderId: string;
  buyerUserId: string;
  reason: string;
  evidenceNote?: string;
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.buyerUserId !== input.buyerUserId) throw new Error('仅下单用户可发起争议');
  if (!['pending_acceptance', 'revision'].includes(order.status)) {
    throw new Error('当前状态不可发起争议');
  }
  if (order.disputeStatus === 'open') throw new Error('争议已在处理中');

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: {
      status: 'dispute',
      disputeStatus: 'open',
      disputeReason: input.reason,
      disputeOpenedAt: new Date(),
      acceptanceDeadlineAt: null
    }
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.buyerUserId,
    eventType: 'dispute_opened',
    fromStatus: order.status,
    toStatus: 'dispute',
    reason: input.reason,
    payload: { evidenceNote: input.evidenceNote || '' }
  });

  await reverseCreatorPendingIncome(order.id);

  if (order.creatorUserId) {
    await notify({
      userId: order.creatorUserId,
      type: 'dispute_opened',
      title: '客户发起订单争议',
      body: input.reason,
      link: `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id }
    });
  }

  return updated;
}

/**
 * 平台判定争议：
 * continue_delivery | partial_refund | full_refund | confirm_complete
 */
export async function resolveDisputeByOps(input: {
  orderId: string;
  actorId: string;
  resolution: 'continue_delivery' | 'partial_refund' | 'full_refund' | 'confirm_complete';
  note?: string;
  refundCents?: number;
}) {
  const order = await prisma.customOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.disputeStatus !== 'open' && order.status !== 'dispute') {
    throw new Error('当前无待处理争议');
  }

  const note = input.note || '';
  let nextStatus = order.status;
  const data: Record<string, unknown> = {
    disputeStatus: input.resolution,
    disputeResolvedAt: new Date(),
    settlementEligibleAt: null
  };

  if (input.resolution === 'continue_delivery') {
    nextStatus = 'revision';
    data.status = 'revision';
    data.acceptanceDeadlineAt = null;
    if (order.instanceId) {
      await prisma.privateAgentInstance.update({
        where: { id: order.instanceId },
        data: { status: 'revision' }
      });
    }
  } else if (input.resolution === 'full_refund') {
    nextStatus = 'closed';
    data.status = 'closed';
    data.paymentStatus = 'refunded';
    data.closedAt = new Date();
    data.closeReason = 'dispute_full_refund';
    data.settlementStatus = 'refunded';
    data.platformFeeCents = 0;
    data.creatorPayoutCents = 0;
  } else if (input.resolution === 'partial_refund') {
    const refundCents = Math.max(0, Math.min(input.refundCents || 0, order.priceCents));
    if (refundCents <= 0) throw new Error('请填写有效的部分退款金额');
    const remaining = order.priceCents - refundCents;
    const platformFeeCents = Math.round(remaining * PLATFORM_FEE_RATE);
    const eligibleAt = new Date(Date.now() + SETTLEMENT_HOLD_MS);
    nextStatus = 'pending_settlement';
    data.status = 'pending_settlement';
    data.settlementStatus = 'pending_settlement';
    data.settlementEligibleAt = eligibleAt;
    data.platformFeeCents = platformFeeCents;
    data.creatorPayoutCents = remaining - platformFeeCents;
    data.priceCents = remaining;
    data.quoteNote = `${order.quoteNote || ''}｜争议部分退款 ¥${(refundCents / 100).toFixed(2)}`.trim();
  } else {
    const eligibleAt = new Date(Date.now() + SETTLEMENT_HOLD_MS);
    nextStatus = 'pending_settlement';
    data.status = 'pending_settlement';
    data.settlementStatus = 'pending_settlement';
    data.settlementEligibleAt = eligibleAt;
  }

  const updated = await prisma.customOrder.update({
    where: { id: order.id },
    data: data as any
  });

  await writeOrderEvent({
    orderId: order.id,
    actorId: input.actorId,
    eventType: 'dispute_resolved',
    fromStatus: 'dispute',
    toStatus: nextStatus,
    reason: note || input.resolution,
    payload: {
      resolution: input.resolution,
      refundCents: input.refundCents || 0,
      note
    }
  });

  const titleMap: Record<string, string> = {
    continue_delivery: '争议判定：继续修改交付',
    partial_refund: '争议判定：部分退款',
    full_refund: '争议判定：全额退款并关闭',
    confirm_complete: '争议判定：确认交付完成'
  };

  for (const uid of [order.buyerUserId, order.creatorUserId].filter(Boolean) as string[]) {
    await notify({
      userId: uid,
      type: 'dispute_resolved',
      title: titleMap[input.resolution],
      body: `${order.orderNo}${note ? ` · ${note}` : ''}`,
      link:
        uid === order.buyerUserId
          ? `/orders?orderId=${order.id}`
          : `/creator-center?tab=orders&orderId=${order.id}`,
      payload: { orderId: order.id, resolution: input.resolution }
    });
  }

  await writeAudit({
    actorId: input.actorId,
    action: 'resolve_dispute',
    targetType: 'custom_order',
    targetId: order.id,
    diff: { resolution: input.resolution, note, refundCents: input.refundCents || 0 }
  });

  return updated;
}

