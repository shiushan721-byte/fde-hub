import { prisma } from '../lib/prisma';

export type PayChannel = 'wechat' | 'alipay';

export const PLATFORM_FEE_RATE = 0.1;
export const WITHDRAW_FEE_RATE = 0.01;
export const WITHDRAW_FEE_MIN_CENTS = 100;
export const PENDING_HOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function newWalletId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newWithdrawNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `WD-${ymd}-${seq}`;
}

export function channelLabel(channel?: string) {
  if (channel === 'wechat') return '微信支付';
  if (channel === 'alipay') return '支付宝';
  return channel || '—';
}

export function creatorPayoutCents(priceCents: number, existingPayout?: number) {
  if (existingPayout && existingPayout > 0) return existingPayout;
  return Math.max(0, priceCents - Math.round(priceCents * PLATFORM_FEE_RATE));
}

export function withdrawFeeCents(amountCents: number) {
  return Math.max(WITHDRAW_FEE_MIN_CENTS, Math.round(amountCents * WITHDRAW_FEE_RATE));
}

export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wallet.create({
    data: {
      id: newWalletId('wal'),
      userId
    }
  });
}

/** 定制进入待验收：收益进入待提现，流水记下订单/客户来源 */
export async function creditCreatorPendingIncome(orderId: string, startedAt?: Date) {
  const order = await prisma.customOrder.findUnique({
    where: { id: orderId },
    include: { buyer: { select: { name: true } } }
  });
  if (!order?.creatorUserId) return null;
  if (order.priceCents <= 0) return null;

  const already = await prisma.walletLedger.findFirst({
    where: { relatedOrderId: order.id, type: 'income', reversed: false }
  });
  if (already) return getOrCreateWallet(order.creatorUserId);

  const payoutCents = creatorPayoutCents(order.priceCents, order.creatorPayoutCents);
  if (payoutCents <= 0) return null;

  const legacy = await prisma.walletLedger.findFirst({
    where: { relatedOrderId: order.id, type: 'settlement_in' }
  });

  const start = startedAt || order.acceptanceStartedAt || new Date();
  const availableAt = new Date(start.getTime() + PENDING_HOLD_MS);
  const now = new Date();
  const releaseNow = Boolean(legacy) || availableAt <= now;

  const wallet = await getOrCreateWallet(order.creatorUserId);

  if (!legacy) {
    const nextPending = wallet.pendingCents + (releaseNow ? 0 : payoutCents);
    const nextAvailable = wallet.availableCents + (releaseNow ? payoutCents : 0);
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { pendingCents: nextPending, availableCents: nextAvailable }
    });
  }

  if (order.creatorPayoutCents <= 0) {
    await prisma.customOrder.update({
      where: { id: order.id },
      data: {
        platformFeeCents: order.priceCents - payoutCents,
        creatorPayoutCents: payoutCents
      }
    });
  }

  await prisma.walletLedger.create({
    data: {
      id: newWalletId('ldg'),
      walletId: wallet.id,
      userId: order.creatorUserId,
      type: 'income',
      amountCents: payoutCents,
      feeCents: 0,
      balanceAfterCents: wallet.pendingCents + wallet.availableCents + (legacy ? 0 : payoutCents),
      title: `定制订单收益 · ${order.orderNo}`,
      sourceOrderNo: order.orderNo,
      sourceBuyer: order.buyer?.name || '客户',
      sourceAgent: order.baseAgentTitle || order.title,
      relatedOrderId: order.id,
      availableAt,
      released: releaseNow,
      createdAt: start
    }
  });

  return getOrCreateWallet(order.creatorUserId);
}

/** 客户申请修改 / 争议：从待提现或可提现撤回该笔收入 */
export async function reverseCreatorPendingIncome(orderId: string) {
  const ledger = await prisma.walletLedger.findFirst({
    where: { relatedOrderId: orderId, type: 'income', reversed: false }
  });
  if (!ledger) return null;

  const wallet = await getOrCreateWallet(ledger.userId);
  let pendingCents = wallet.pendingCents;
  let availableCents = wallet.availableCents;
  if (ledger.released) {
    availableCents = Math.max(0, availableCents - ledger.amountCents);
  } else {
    pendingCents = Math.max(0, pendingCents - ledger.amountCents);
  }

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { pendingCents, availableCents }
  });
  await prisma.walletLedger.update({
    where: { id: ledger.id },
    data: { reversed: true }
  });
  return prisma.wallet.findUnique({ where: { id: wallet.id } });
}

/** T+7：待提现转入可提现 */
export async function releasePendingIncomes(now = new Date()) {
  const due = await prisma.walletLedger.findMany({
    where: {
      type: 'income',
      reversed: false,
      released: false,
      availableAt: { lte: now }
    }
  });

  let released = 0;
  for (const row of due) {
    const wallet = await getOrCreateWallet(row.userId);
    const amount = Math.min(row.amountCents, wallet.pendingCents);
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingCents: Math.max(0, wallet.pendingCents - amount),
        availableCents: wallet.availableCents + amount
      }
    });
    await prisma.walletLedger.update({
      where: { id: row.id },
      data: { released: true }
    });
    released += 1;
  }
  return { released };
}

export async function bindPayoutAccount(input: {
  userId: string;
  channel: PayChannel;
  account: string;
}) {
  const account = input.account.trim();
  if (!account) throw new Error('请填写收款账号');
  if (input.channel !== 'alipay') throw new Error('目前仅支持绑定支付宝收款账号');
  const wallet = await getOrCreateWallet(input.userId);
  return prisma.wallet.update({
    where: { id: wallet.id },
    data: { alipayAccount: account, alipayBound: true }
  });
}

export async function requestWithdrawal(input: {
  userId: string;
  amountCents: number;
  channel: PayChannel;
}) {
  if (input.amountCents < 1000) throw new Error('单笔提现不少于 ¥10.00');
  await releasePendingIncomes();
  const wallet = await getOrCreateWallet(input.userId);
  if (input.amountCents > wallet.availableCents) throw new Error('可提现余额不足');

  if (input.channel !== 'alipay') throw new Error('目前仅支持提现至支付宝');
  const bound = { ok: wallet.alipayBound, account: wallet.alipayAccount };
  if (!bound.ok || !bound.account) {
    throw new Error('请先绑定支付宝收款账号');
  }

  const feeCents = withdrawFeeCents(input.amountCents);
  if (feeCents >= input.amountCents) throw new Error('提现金额过低，不足以支付手续费');
  const netCents = input.amountCents - feeCents;

  const withdraw = await prisma.withdrawal.create({
    data: {
      id: newWalletId('wd'),
      withdrawNo: newWithdrawNo(),
      userId: input.userId,
      walletId: wallet.id,
      amountCents: input.amountCents,
      feeCents,
      channel: input.channel,
      account: bound.account,
      status: 'pending',
      reason: `手续费 ¥${(feeCents / 100).toFixed(2)}，实到 ¥${(netCents / 100).toFixed(2)}`
    }
  });

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      availableCents: wallet.availableCents - input.amountCents,
      frozenCents: wallet.frozenCents + input.amountCents
    }
  });

  return { ...withdraw, netCents };
}

export async function reviewWithdrawal(input: {
  withdrawId: string;
  approved: boolean;
  actorId: string;
  reason?: string;
}) {
  const withdraw = await prisma.withdrawal.findUnique({ where: { id: input.withdrawId } });
  if (!withdraw) throw new Error('提现单不存在');

  if (input.approved) {
    if (withdraw.status !== 'pending') throw new Error('仅待审核提现可审核通过');
    return prisma.withdrawal.update({
      where: { id: withdraw.id },
      data: {
        status: 'approved',
        reviewedBy: input.actorId,
        reviewedAt: new Date(),
        reason: input.reason?.trim() || withdraw.reason
      }
    });
  }

  if (withdraw.status !== 'pending' && withdraw.status !== 'approved') {
    throw new Error('当前状态不可驳回');
  }
  const reason = input.reason?.trim();
  if (!reason) throw new Error('驳回请填写原因');
  const wallet = await getOrCreateWallet(withdraw.userId);
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      availableCents: wallet.availableCents + withdraw.amountCents,
      frozenCents: Math.max(0, wallet.frozenCents - withdraw.amountCents)
    }
  });
  return prisma.withdrawal.update({
    where: { id: withdraw.id },
    data: {
      status: 'rejected',
      reviewedBy: input.actorId,
      reviewedAt: new Date(),
      reason,
      processedAt: new Date()
    }
  });
}

export async function markWithdrawalPaid(input: {
  withdrawId: string;
  actorId: string;
  paidNote: string;
}) {
  const note = input.paidNote.trim();
  if (!note) throw new Error('请填写线下打款流水号或备注');
  const withdraw = await prisma.withdrawal.findUnique({ where: { id: input.withdrawId } });
  if (!withdraw) throw new Error('提现单不存在');
  if (withdraw.status !== 'approved' && withdraw.status !== 'pending') {
    throw new Error('仅审核通过的提现可确认打款');
  }
  if (withdraw.status === 'pending') {
    throw new Error('请先审核通过后再确认打款');
  }

  const wallet = await getOrCreateWallet(withdraw.userId);
  const nextAvailable = wallet.availableCents;
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { frozenCents: Math.max(0, wallet.frozenCents - withdraw.amountCents) }
  });
  await prisma.walletLedger.create({
    data: {
      id: newWalletId('ldg'),
      walletId: wallet.id,
      userId: withdraw.userId,
      type: 'withdrawal',
      amountCents: -withdraw.amountCents,
      feeCents: withdraw.feeCents,
      balanceAfterCents: nextAvailable,
      channel: withdraw.channel,
      title: `提现至${channelLabel(withdraw.channel)}（${withdraw.account}）`,
      relatedWithdrawalId: withdraw.id
    }
  });
  return prisma.withdrawal.update({
    where: { id: withdraw.id },
    data: {
      status: 'paid',
      paidNote: note,
      processedAt: new Date()
    }
  });
}

export async function getWalletOverview(userId: string) {
  await releasePendingIncomes();
  const wallet = await getOrCreateWallet(userId);
  const [ledgers, withdrawals] = await Promise.all([
    prisma.walletLedger.findMany({
      where: { userId, reversed: false, type: { in: ['income', 'withdrawal'] } },
      orderBy: { createdAt: 'desc' },
      take: 80
    }),
    prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 40
    })
  ]);

  const incomeLedgers = ledgers.filter((l) => l.type === 'income');
  const withdrawLedgers = ledgers.filter((l) => l.type === 'withdrawal');
  const totalIncomeCents = incomeLedgers.reduce((sum, l) => sum + l.amountCents, 0);
  const withdrawnTotalCents = withdrawals
    .filter((w) => w.status === 'paid' || w.status === 'succeeded')
    .reduce((sum, w) => sum + w.amountCents, 0);
  const withdrawnFeeCents = withdrawals
    .filter((w) => w.status === 'paid' || w.status === 'succeeded')
    .reduce((sum, w) => sum + w.feeCents, 0);

  return {
    userId,
    pendingCents: wallet.pendingCents,
    availableCents: wallet.availableCents,
    frozenCents: wallet.frozenCents,
    withdrawnTotalCents,
    withdrawnFeeCents,
    totalIncomeCents,
    withdrawFeeRate: WITHDRAW_FEE_RATE,
    withdrawFeeMinCents: WITHDRAW_FEE_MIN_CENTS,
    pendingHoldDays: 7,
    payout: {
      alipayBound: wallet.alipayBound,
      alipayAccount: wallet.alipayAccount
    },
    incomes: incomeLedgers,
    withdrawals,
    withdrawLedgers
  };
}
