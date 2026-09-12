import { prisma } from '../lib/prisma';
import { parseJson, toJson } from '../lib/json';
import { pricingFromAgent, type CatalogPlan } from '../../shared/pricingPlans';
import {
  adapterDisplayName,
  adapterPackageIsFree,
  adapterPackagePriceYuan,
  findAdapterPackage,
  normalizeAdapterPackages
} from '../../shared/adapterPackages';
import { createPendingPayment, markPaymentPaid } from './payments';
import { creatorPayoutCents, getOrCreateWallet, newWalletId } from './wallet';
import type { PayChannel } from './wallet';
import { getPendingHoldMs } from './financeSettings';
import { notifyUser, resolveExpertUserId, yuan } from './notifications';

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export const ONE_TIME_PLAN: CatalogPlan = 'one_time';

export function licenseActive(row: { status: string; expiresAt: Date | null }) {
  if (row.status !== 'paid') return false;
  if (!row.expiresAt) return true;
  return row.expiresAt.getTime() > Date.now();
}

export function mapPurchase(row: {
  id: string;
  agentId: string;
  plan: string;
  kind?: string;
  packageId?: string;
  priceCents: number;
  status: string;
  channel: string;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt?: Date;
  priceSnapshot?: string;
}) {
  const snapshot = parseJson<Record<string, unknown>>(row.priceSnapshot || '{}', {});
  return {
    id: row.id,
    agentId: row.agentId,
    plan: row.plan,
    kind: row.kind || 'catalog',
    packageId: row.packageId || '',
    packageName: typeof snapshot.packageName === 'string' ? snapshot.packageName : '',
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
    where: { userId, agentId, status: 'paid', kind: 'catalog' },
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

export async function creditCatalogSale(purchaseId: string) {
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
      title: purchase.kind === 'adapter'
        ? `适配下载 · ${purchase.agent.title}`
        : `标准版购买 · ${purchase.agent.title}`,
      sourceKind: 'agent',
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

  const yuan = plans.price;
  if (yuan < 1) throw httpError('售价无效', 400);

  const active = await getActiveLicense(input.userId, agent.id);
  if (active) throw httpError('已购买该智能体，无需重复购买', 409);

  const pending = await prisma.agentPurchase.findFirst({
    where: {
      userId: input.userId,
      agentId: agent.id,
      status: 'pending',
      kind: 'catalog'
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
      data: { channel: input.channel, paymentId: payment.id, plan: ONE_TIME_PLAN }
    });
    return { purchase: updated, payment };
  }

  const purchase = await prisma.agentPurchase.create({
    data: {
      id: newWalletId('ap'),
      agentId: agent.id,
      userId: input.userId,
      plan: ONE_TIME_PLAN,
      kind: 'catalog',
      packageId: '',
      priceCents: yuan * 100,
      priceSnapshot: toJson({ ...plans, plan: ONE_TIME_PLAN }),
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
      expiresAt: null
    }
  });
  await creditCatalogSale(updated.id).catch((err) =>
    console.warn('[catalog-purchase] credit failed', err)
  );
  await notifyPurchasePaid(updated.id).catch((err) =>
    console.warn('[catalog-purchase] notify failed', err)
  );
  return updated;
}

async function notifyPurchasePaid(purchaseId: string) {
  const purchase = await prisma.agentPurchase.findUnique({
    where: { id: purchaseId },
    include: { agent: { select: { id: true, title: true, authorId: true } } }
  });
  if (!purchase || purchase.status !== 'paid') return;

  const snapshot = parseJson<Record<string, unknown>>(purchase.priceSnapshot || '{}', {});
  const packageName = typeof snapshot.packageName === 'string' ? snapshot.packageName : '';
  const isAdapter = purchase.kind === 'adapter';
  const amount = yuan(purchase.priceCents);

  await notifyUser({
    userId: purchase.userId,
    type: isAdapter ? 'adapter_purchase_paid' : 'catalog_purchase_paid',
    title: isAdapter ? 'Skill / 适配包购买成功' : '智能体使用权购买成功',
    body: isAdapter
      ? `你已购买「${purchase.agent.title}」的 ${packageName || '适配包'}，可前往智能体详情下载。`
      : `你已获得「${purchase.agent.title}」标准版使用权，可立即使用。`,
    link: `/agent/${purchase.agent.id}`,
    payload: {
      purchaseId: purchase.id,
      agentId: purchase.agent.id,
      agentTitle: purchase.agent.title,
      packageId: purchase.packageId,
      packageName,
      priceCents: purchase.priceCents
    }
  });

  const creatorUserId = await resolveExpertUserId(purchase.agent.authorId);
  if (creatorUserId && creatorUserId !== purchase.userId && purchase.priceCents > 0) {
    await notifyUser({
      userId: creatorUserId,
      type: 'order_settled_notice',
      title: isAdapter ? '适配包销售收入已入账' : '标准版销售收入已入账',
      body: `「${purchase.agent.title}」成交 ${amount}，收益将按规则进入待结算。`,
      link: '/creator-center?tab=account',
      payload: {
        purchaseId: purchase.id,
        agentId: purchase.agent.id,
        agentTitle: purchase.agent.title,
        priceCents: purchase.priceCents
      }
    });
  }
}

export async function getAdapterEntitlement(userId: string, agentId: string, packageId: string) {
  const row = await prisma.agentPurchase.findFirst({
    where: {
      userId,
      agentId,
      packageId,
      kind: 'adapter',
      status: 'paid'
    },
    orderBy: { paidAt: 'desc' }
  });
  return row && licenseActive(row) ? row : null;
}

export async function listAdapterEntitlements(userId: string, agentId: string) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, creatorDeletedAt: null }
  });
  if (!agent) return [];
  const packs = normalizeAdapterPackages(parseJson(agent.adapterPackages, []));
  const paid = await prisma.agentPurchase.findMany({
    where: { userId, agentId, kind: 'adapter', status: 'paid' },
    orderBy: { paidAt: 'desc' }
  });
  const paidByPackage = new Map<string, (typeof paid)[number]>();
  for (const row of paid) {
    if (!paidByPackage.has(row.packageId) && licenseActive(row)) {
      paidByPackage.set(row.packageId, row);
    }
  }
  return packs.map((pack) => {
    const free = adapterPackageIsFree(pack);
    const owned = free || Boolean(paidByPackage.get(pack.id));
    return {
      packageId: pack.id,
      platformName: pack.platformName,
      fileName: pack.fileName,
      isFree: free,
      price: adapterPackagePriceYuan(pack),
      owned,
      url: owned ? pack.url : ''
    };
  });
}

export async function createAdapterCheckout(input: {
  userId: string;
  agentId: string;
  packageId: string;
  channel: PayChannel;
}) {
  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在', 404);
  const pack = findAdapterPackage(parseJson(agent.adapterPackages, []), input.packageId);
  if (!pack) throw httpError('适配包不存在', 404);
  if (adapterPackageIsFree(pack)) throw httpError('该适配包免费，无需购买', 400);
  const yuan = adapterPackagePriceYuan(pack);
  if (yuan < 1) throw httpError('售价无效', 400);

  const owned = await getAdapterEntitlement(input.userId, agent.id, pack.id);
  if (owned) throw httpError('已购买该适配包，无需重复购买', 409);

  const pending = await prisma.agentPurchase.findFirst({
    where: {
      userId: input.userId,
      agentId: agent.id,
      packageId: pack.id,
      kind: 'adapter',
      status: 'pending'
    },
    orderBy: { createdAt: 'desc' }
  });
  const snapshot = {
    kind: 'adapter',
    packageId: pack.id,
    packageName: adapterDisplayName(pack.platformName),
    isFree: false,
    price: yuan
  };
  if (pending && pending.priceCents === yuan * 100) {
    const payment = await createPendingPayment({
      orderId: pending.id,
      userId: input.userId,
      amountCents: pending.priceCents,
      channel: input.channel
    });
    const updated = await prisma.agentPurchase.update({
      where: { id: pending.id },
      data: {
        channel: input.channel,
        paymentId: payment.id,
        kind: 'adapter',
        packageId: pack.id,
        priceSnapshot: toJson(snapshot)
      }
    });
    return { purchase: updated, payment };
  }

  const purchase = await prisma.agentPurchase.create({
    data: {
      id: newWalletId('ap'),
      agentId: agent.id,
      userId: input.userId,
      plan: 'adapter',
      kind: 'adapter',
      packageId: pack.id,
      priceCents: yuan * 100,
      priceSnapshot: toJson(snapshot),
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

