import { prisma } from '../lib/prisma';
import { parseJson, toJson } from '../lib/json';
import { pricingFromAgent } from '../../shared/pricingPlans';
import { creditCatalogSale } from '../services/catalogPurchase';
import {
  bindPayoutAccount,
  creditCreatorPendingIncome,
  getOrCreateWallet,
  newWalletId,
  newWithdrawNo,
  releasePendingIncomes,
  withdrawFeeCents
} from '../services/wallet';
import { ensureFinanceSettings } from '../services/financeSettings';
import {
  backfillFinanceJournals,
  ensureFinanceAccounts
} from '../services/platformFinance';

const CREATOR_ID = 'user-fde-linran';
const BUYER_ID = 'user-demo';

/** 为演示专家补齐钱包、收款绑定，并按待验收起算待提现/可提现 */
export async function ensureFinanceSynced() {
  await ensureFinanceSettings();
  await ensureFinanceAccounts();
  await backfillFinanceJournals();

  const users = await prisma.user.findMany({
    select: { id: true, role: true, phone: true, expert: { select: { sortOrder: true } } }
  });
  for (const user of users) {
    await getOrCreateWallet(user.id);
    if (user.role === 'expert' && !user.phone?.trim()) {
      const n = user.expert?.sortOrder || 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: `138${String(10000000 + n).slice(-8)}` }
      });
    }
  }

  const creatorWallet = await prisma.wallet.findUnique({ where: { userId: CREATOR_ID } });
  if (creatorWallet && !creatorWallet.alipayBound) {
    await bindPayoutAccount({
      userId: CREATOR_ID,
      channel: 'alipay',
      account: 'linran.fde@hellome.art'
    });
  }

  const orders = await prisma.customOrder.findMany({
    where: {
      creatorUserId: { not: null },
      status: { in: ['pending_acceptance', 'pending_settlement', 'completed'] }
    }
  });

  for (const order of orders) {
    const channel = order.paymentChannel === 'alipay' ? 'alipay' : 'wechat';
    let paymentId = order.paymentId;
    const existingPay = paymentId
      ? await prisma.paymentRecord.findUnique({ where: { id: paymentId } })
      : null;
    if (!existingPay && order.priceCents > 0) {
      const record = await prisma.paymentRecord.create({
        data: {
          id: paymentId && paymentId.startsWith('pay_') ? paymentId : newWalletId('pay'),
          orderId: order.id,
          userId: order.buyerUserId || BUYER_ID,
          channel,
          amountCents: order.priceCents,
          status: 'paid',
          checkoutCode: `HM-${channel.toUpperCase()}-SEED`,
          paidAt: order.paidAt || order.createdAt,
          createdAt: order.paidAt || order.createdAt
        }
      });
      paymentId = record.id;
      if (order.paymentId !== paymentId || !order.paymentChannel) {
        await prisma.customOrder.update({
          where: { id: order.id },
          data: { paymentId, paymentChannel: order.paymentChannel || channel }
        });
      }
    }

    await creditCreatorPendingIncome(order.id, order.acceptanceStartedAt || order.settledAt || order.createdAt);
  }

  const linranAgents = await prisma.agent.findMany({
    where: { authorId: 'fde-linran', creatorDeletedAt: null, status: 'published' }
  });
  const paidAgents = linranAgents
    .map((agent) => ({
      agent,
      plans: pricingFromAgent({
        price: agent.price,
        pricingPlans: parseJson(agent.pricingPlans, {})
      })
    }))
    .filter((row) => !row.plans.isFree && row.plans.price > 0)
    .slice(0, 4);

  for (const [index, row] of paidAgents.entries()) {
    const purchaseId = `ap_seed_${row.agent.id}`;
    const paidAt = new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000);
    await prisma.agentPurchase.upsert({
      where: { id: purchaseId },
      create: {
        id: purchaseId,
        agentId: row.agent.id,
        userId: BUYER_ID,
        plan: 'one_time',
        priceCents: row.plans.price * 100,
        priceSnapshot: toJson(row.plans),
        status: 'paid',
        channel: index % 2 === 0 ? 'alipay' : 'wechat',
        paidAt,
        createdAt: paidAt
      },
      update: {
        status: 'paid',
        priceCents: row.plans.price * 100,
        paidAt
      }
    });
    await creditCatalogSale(purchaseId);
  }

  await prisma.walletLedger.updateMany({
    where: { type: 'income', title: { contains: '定制订单' } },
    data: { sourceKind: 'custom' }
  });
  await prisma.walletLedger.updateMany({
    where: { type: 'income', OR: [{ title: { contains: '标准版购买' } }, { relatedOrderId: { startsWith: 'ap_' } }] },
    data: { sourceKind: 'agent' }
  });

  await releasePendingIncomes();
  const wallet = await prisma.wallet.findUnique({ where: { userId: CREATOR_ID } });
  if (wallet) {
    const inflight = await prisma.withdrawal.findFirst({
      where: { userId: CREATOR_ID, status: { in: ['pending', 'approved'] } }
    });
    const amountCents = Math.min(5000, wallet.availableCents);
    if (!inflight && amountCents >= 1000) {
      const feeCents = withdrawFeeCents(amountCents);
      await prisma.withdrawal.create({
        data: {
          id: newWalletId('wd'),
          withdrawNo: newWithdrawNo(),
          userId: CREATOR_ID,
          walletId: wallet.id,
          amountCents,
          feeCents,
          channel: 'alipay',
          account: wallet.alipayAccount || 'linran.fde@hellome.art',
          status: 'pending',
          reason: `手续费 ¥${(feeCents / 100).toFixed(2)}，实到 ¥${((amountCents - feeCents) / 100).toFixed(2)}`
        }
      });
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          availableCents: wallet.availableCents - amountCents,
          frozenCents: wallet.frozenCents + amountCents
        }
      });
    }
  }
}
