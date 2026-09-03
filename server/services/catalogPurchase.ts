import { prisma } from '../lib/prisma';
import { parseJson, toJson } from '../lib/json';
import { pricingFromAgent, type PreferredPlan } from '../../shared/pricingPlans';
import { createPendingPayment, markPaymentPaid } from './payments';
import { creatorPayoutCents, getOrCreateWallet, newWalletId } from './wallet';
import type { PayChannel } from './wallet';
import { getPendingHoldMs } from './financeSettings';

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export type CatalogPlan = PreferredPlan;

export function isCatalogPlan(raw: unknown): raw is CatalogPlan {
  return raw === 'monthly' || raw === 'annual' || raw === 'buyout';
}

export function planExpiresAt(plan: CatalogPlan, paidAt: Date) {
  if (plan === 'buyout') return null;
  const expires = new Date(paidAt);
  if (plan === 'annual') expires.setFullYear(expires.getFullYear() + 1);
  else expires.setMonth(expires.getMonth() + 1);
  return expires;
}

export function licenseActive(row: { status: string; expiresAt: Date | null }) {
  if (row.status !== 'paid') return false;
  if (!row.expiresAt) return true;
  return row.expiresAt.getTime() > Date.now();
}

export function mapPurchase(row: {
  id: string;
  agentId: string;
  plan: string;
  priceCents: number;
  status: string;
  channel: string;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt?: Date;
}) {
  return {
    id: row.id,
    agentId: row.agentId,
    plan: row.plan,
    priceCents: row.priceCents,
    status: row.status,
    channel: row.channel,
    paidAt: row.paidAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    active: licenseActive(row)
  };
}

export async function getActiveLicense(userId: string, agentId: string) {
  const rows = await prisma.agentPurchase.findMany({
    where: { userId, agentId, status: 'paid' },
    orderBy: { paidAt: 'desc' }
  });
  return rows.find((row) => licenseActive(row)) || null;
}

export async function listMyPurchases(userId: string) {
  const rows = await prisma.agentPurchase.findMany({
    where: { userId },
    include: { agent: { select: { id: true, title: true, authorName: true } } },
    orderBy: [{ createdAt: 'desc' }]
  });
  return rows.map((row) => ({
    ...mapPurchase(row),
    agentTitle: row.agent.title,
    authorName: row.agent.authorName || ''
  }));
}

function yuanForPlan(plan: CatalogPlan, monthly: number, annual: number, buyout: number) {
  if (plan === 'annual') return annual;
  if (plan === 'buyout') return buyout;
  return monthly;
}

async function creditCatalogSale(purchaseId: string) {
  const purchase = await prisma.agentPurchase.findUnique({
    where: { id: purchaseId },
    include: { agent: true, user: { select: { name: true } } }
  });
  if (!purchase || purchase.status !== 'paid' || purchase.priceCents <= 0) return;
  if (!purchase.agent.authorId) return;

  const expert = await prisma.expert.findUnique({
    where: { id: purchase.agent.authorId },
    select: { userId: true }
  });
  if (!expert?.userId) return;

  const already = await prisma.walletLedger.findFirst({
    where: { relatedOrderId: purchase.id, type: 'income', reversed: false }
  });
  if (already) return;

  const payoutCents = await creatorPayoutCents(purchase.priceCents, 0, purchase.paidAt);
  if (payoutCents <= 0) return;

  const holdMs = await getPendingHoldMs();
  const start = purchase.paidAt || new Date();
  const availableAt = new Date(start.getTime() + holdMs);
  const wallet = await getOrCreateWallet(expert.userId);
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { pendingCents: wallet.pendingCents + payoutCents }
  });
  await prisma.walletLedger.create({
    data: {
      id: newWalletId('ldg'),
      walletId: wallet.id,
      userId: expert.userId,
      type: 'income',
      amountCents: payoutCents,
      feeCents: purchase.priceCents - payoutCents,
      balanceAfterCents: wallet.pendingCents + wallet.availableCents + payoutCents,
      title: `标准版购买 · ${purchase.agent.title}`,
      sourceOrderNo: purchase.id,
      sourceBuyer: purchase.user.name,
      sourceAgent: purchase.agent.title,
      relatedOrderId: purchase.id,
      relatedPaymentId: purchase.paymentId,
      availableAt,
      released: false
    }
  });
}

export async function createCatalogCheckout(input: {
  userId: string;
  agentId: string;
  plan: CatalogPlan;
  channel: PayChannel;
}) {
  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在', 404);

  const plans = pricingFromAgent({
    price: agent.price,
    pricingPlans: parseJson(agent.pricingPlans, {})
  });
  if (plans.isFree) throw httpError('该智能体免费开放，无需购买', 400);

  const yuan = yuanForPlan(input.plan, plans.monthlyPrice, plans.annualPrice, plans.buyoutPrice);
  if (yuan < 1) throw httpError('所选套餐价格无效', 400);

  const active = await getActiveLicense(input.userId, agent.id);
  if (active?.plan === 'buyout') throw httpError('已买断该智能体，无需重复购买', 409);
  if (active?.plan === input.plan) throw httpError('当前套餐仍在有效期内', 409);

  const pending = await prisma.agentPurchase.findFirst({
    where: {
      userId: input.userId,
      agentId: agent.id,
      plan: input.plan,
      status: 'pending'
    },
    orderBy: { createdAt: 'desc' }
  });
  if (pending && pending.priceCents === yuan * 100) {
    const payment = await createPendingPayment({
      orderId: pending.id,
      userId: input.userId,
      amountCents: pending.priceCents,
      channel: input.channel
    });
    const updated = await prisma.agentPurchase.update({
      where: { id: pending.id },
      data: { channel: input.channel, paymentId: payment.id }
    });
    return { purchase: updated, payment };
  }

  const purchase = await prisma.agentPurchase.create({
    data: {
      id: newWalletId('ap'),
      agentId: agent.id,
      userId: input.userId,
      plan: input.plan,
      priceCents: yuan * 100,
      priceSnapshot: toJson({ ...plans, plan: input.plan }),
      status: 'pending',
      channel: input.channel
    }
  });
  const payment = await createPendingPayment({
    orderId: purchase.id,
    userId: input.userId,
    amountCents: purchase.priceCents,
    channel: input.channel
  });
  const withPay = await prisma.agentPurchase.update({
    where: { id: purchase.id },
    data: { paymentId: payment.id }
  });
  return { purchase: withPay, payment };
}

export async function payCatalogPurchase(input: {
  userId: string;
  purchaseId: string;
  channel: PayChannel;
}) {
  const purchase = await prisma.agentPurchase.findFirst({
    where: { id: input.purchaseId, userId: input.userId }
  });
  if (!purchase) throw httpError('订单不存在', 404);
  if (purchase.status === 'paid') return { purchase, alreadyPaid: true };

  const payment = await createPendingPayment({
    orderId: purchase.id,
    userId: input.userId,
    amountCents: purchase.priceCents,
    channel: input.channel
  });
  const updated = await prisma.agentPurchase.update({
    where: { id: purchase.id },
    data: { channel: input.channel, paymentId: payment.id }
  });
  return { purchase: updated, payment, alreadyPaid: false };
}

export async function confirmCatalogPurchase(input: {
  userId: string;
  purchaseId: string;
  channel?: PayChannel;
}) {
  const purchase = await prisma.agentPurchase.findFirst({
    where: { id: input.purchaseId, userId: input.userId }
  });
  if (!purchase) throw httpError('订单不存在', 404);
  if (purchase.status === 'paid') return purchase;

  let paymentId = purchase.paymentId;
  if (!paymentId) {
    const payment = await createPendingPayment({
      orderId: purchase.id,
      userId: input.userId,
      amountCents: purchase.priceCents,
      channel: (input.channel || purchase.channel || 'wechat') as PayChannel
    });
    paymentId = payment.id;
  }
  await markPaymentPaid(paymentId);
  const paidAt = new Date();
  const updated = await prisma.agentPurchase.update({
    where: { id: purchase.id },
    data: {
      status: 'paid',
      channel: input.channel || purchase.channel,
      paymentId,
      paidAt,
      expiresAt: planExpiresAt(purchase.plan as CatalogPlan, paidAt)
    }
  });
  await creditCatalogSale(updated.id).catch((err) =>
    console.warn('[catalog-purchase] credit failed', err)
  );
  return updated;
}
