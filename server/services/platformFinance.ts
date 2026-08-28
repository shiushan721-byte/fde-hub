import { prisma } from '../lib/prisma';

export const FINANCE_ACCOUNT_CODES = {
  WECHAT_IN: 'wechat_income',
  ALIPAY_IN: 'alipay_income',
  ESCROW: 'escrow_holding',
  PLATFORM_FEE: 'platform_fee_income',
  EXPERT_PAYABLE: 'expert_payable',
  WITHDRAW_TRANSIT: 'withdraw_transit',
  WITHDRAW_PAID: 'withdraw_paid',
  WITHDRAW_FEE: 'withdraw_fee_income'
} as const;

export type FinanceAccountCode =
  (typeof FINANCE_ACCOUNT_CODES)[keyof typeof FINANCE_ACCOUNT_CODES];

const DEFAULT_ACCOUNTS: Array<{
  id: string;
  code: FinanceAccountCode;
  name: string;
  type: 'income' | 'expense';
  sortOrder: number;
}> = [
  {
    id: 'fac_wechat_income',
    code: FINANCE_ACCOUNT_CODES.WECHAT_IN,
    name: 'HelloMe-微信收入账户',
    type: 'income',
    sortOrder: 10
  },
  {
    id: 'fac_alipay_income',
    code: FINANCE_ACCOUNT_CODES.ALIPAY_IN,
    name: 'HelloMe-支付宝收入账户',
    type: 'income',
    sortOrder: 20
  },
  {
    id: 'fac_escrow',
    code: FINANCE_ACCOUNT_CODES.ESCROW,
    name: 'HelloMe-资金托管账户',
    type: 'expense',
    sortOrder: 30
  },
  {
    id: 'fac_platform_fee',
    code: FINANCE_ACCOUNT_CODES.PLATFORM_FEE,
    name: 'HelloMe-平台服务费收入账户',
    type: 'income',
    sortOrder: 40
  },
  {
    id: 'fac_expert_payable',
    code: FINANCE_ACCOUNT_CODES.EXPERT_PAYABLE,
    name: 'HelloMe-专家可结算账户',
    type: 'expense',
    sortOrder: 50
  },
  {
    id: 'fac_withdraw_transit',
    code: FINANCE_ACCOUNT_CODES.WITHDRAW_TRANSIT,
    name: 'HelloMe-提现在途账户',
    type: 'expense',
    sortOrder: 60
  },
  {
    id: 'fac_withdraw_paid',
    code: FINANCE_ACCOUNT_CODES.WITHDRAW_PAID,
    name: 'HelloMe-提现打款支出账户',
    type: 'expense',
    sortOrder: 70
  },
  {
    id: 'fac_withdraw_fee',
    code: FINANCE_ACCOUNT_CODES.WITHDRAW_FEE,
    name: 'HelloMe-提现手续费收入账户',
    type: 'income',
    sortOrder: 80
  }
];

function newFlowNo() {
  const n = `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
  return `FLOW${n}`;
}

function newEntryId() {
  return `fle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newJournalId() {
  return `fj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensureFinanceAccounts() {
  for (const row of DEFAULT_ACCOUNTS) {
    await prisma.financeAccount.upsert({
      where: { code: row.code },
      create: {
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        sortOrder: row.sortOrder,
        enabled: true
      },
      update: {
        name: row.name,
        type: row.type,
        sortOrder: row.sortOrder,
        enabled: true
      }
    });
  }
  return prisma.financeAccount.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }]
  });
}

export async function listFinanceAccounts() {
  await ensureFinanceAccounts();
  return prisma.financeAccount.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }]
  });
}

type JournalLine = {
  accountCode: FinanceAccountCode;
  amountCents: number;
};

/**
 * 记账：同一幂等键只成功一次。amountCents 正数增加科目余额，负数减少。
 */
export async function postFinanceJournal(input: {
  idempotencyKey: string;
  bizType: string;
  bizOrderNo?: string;
  operationType: string;
  relatedOrderId?: string;
  relatedPaymentId?: string;
  relatedWithdrawalId?: string;
  operatorId?: string;
  operatorName?: string;
  remark?: string;
  lines: JournalLine[];
  at?: Date;
}) {
  const existing = await prisma.financeJournal.findUnique({
    where: { idempotencyKey: input.idempotencyKey }
  });
  if (existing) return existing;

  const lines = input.lines.filter((l) => l.amountCents !== 0);
  if (lines.length === 0) throw new Error('分录不能为空');

  await ensureFinanceAccounts();
  const accounts = await prisma.financeAccount.findMany({
    where: { code: { in: lines.map((l) => l.accountCode) } }
  });
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  for (const line of lines) {
    if (!byCode.has(line.accountCode)) {
      throw new Error(`财务科目不存在：${line.accountCode}`);
    }
  }

  const flowNo = newFlowNo();
  const createdAt = input.at || new Date();

  return prisma.$transaction(async (tx) => {
    const again = await tx.financeJournal.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (again) return again;

    const journal = await tx.financeJournal.create({
      data: {
        id: newJournalId(),
        flowNo,
        idempotencyKey: input.idempotencyKey,
        bizType: input.bizType,
        bizOrderNo: input.bizOrderNo || '',
        operationType: input.operationType,
        relatedOrderId: input.relatedOrderId || '',
        relatedPaymentId: input.relatedPaymentId || '',
        relatedWithdrawalId: input.relatedWithdrawalId || '',
        operatorId: input.operatorId || '',
        operatorName: input.operatorName || '',
        remark: input.remark || '',
        createdAt
      }
    });

    for (const line of lines) {
      const account = byCode.get(line.accountCode)!;
      const updated = await tx.financeAccount.update({
        where: { id: account.id },
        data: { balanceCents: { increment: line.amountCents } }
      });
      await tx.financeLedgerEntry.create({
        data: {
          id: newEntryId(),
          journalId: journal.id,
          flowNo,
          accountId: account.id,
          amountCents: line.amountCents,
          balanceAfterCents: updated.balanceCents,
          bizOrderNo: input.bizOrderNo || '',
          bizType: input.bizType,
          operationType: input.operationType,
          createdAt
        }
      });
      account.balanceCents = updated.balanceCents;
    }

    return journal;
  });
}

export async function postEscrowReceived(input: {
  orderId: string;
  orderNo: string;
  amountCents: number;
  channel: string;
  paymentId?: string;
  operatorId?: string;
  operatorName?: string;
  at?: Date;
}) {
  const incomeCode =
    input.channel === 'alipay'
      ? FINANCE_ACCOUNT_CODES.ALIPAY_IN
      : FINANCE_ACCOUNT_CODES.WECHAT_IN;
  return postFinanceJournal({
    idempotencyKey: `escrow:${input.orderId}`,
    bizType: 'payment',
    bizOrderNo: input.orderNo,
    operationType: '支付托管入账',
    relatedOrderId: input.orderId,
    relatedPaymentId: input.paymentId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    remark: `${input.channel === 'alipay' ? '支付宝' : '微信'}收款托管`,
    at: input.at,
    lines: [
      { accountCode: incomeCode, amountCents: input.amountCents },
      { accountCode: FINANCE_ACCOUNT_CODES.ESCROW, amountCents: input.amountCents }
    ]
  });
}

export async function postOrderSettlement(input: {
  orderId: string;
  orderNo: string;
  priceCents: number;
  platformFeeCents: number;
  creatorPayoutCents: number;
  operatorId?: string;
  operatorName?: string;
  at?: Date;
}) {
  const fee = Math.max(0, input.platformFeeCents);
  const payout = Math.max(0, input.creatorPayoutCents);
  const escrowOut = fee + payout;
  return postFinanceJournal({
    idempotencyKey: `settle:${input.orderId}`,
    bizType: 'settlement',
    bizOrderNo: input.orderNo,
    operationType: '订单结算释放',
    relatedOrderId: input.orderId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    remark: `服务费 ¥${(fee / 100).toFixed(2)} · 专家 ¥${(payout / 100).toFixed(2)}`,
    at: input.at,
    lines: [
      { accountCode: FINANCE_ACCOUNT_CODES.ESCROW, amountCents: -escrowOut },
      ...(fee > 0
        ? [{ accountCode: FINANCE_ACCOUNT_CODES.PLATFORM_FEE, amountCents: fee } as JournalLine]
        : []),
      ...(payout > 0
        ? [
            {
              accountCode: FINANCE_ACCOUNT_CODES.EXPERT_PAYABLE,
              amountCents: payout
            } as JournalLine
          ]
        : [])
    ]
  });
}

export async function postWithdrawalRequested(input: {
  withdrawId: string;
  withdrawNo: string;
  amountCents: number;
  operatorId?: string;
  operatorName?: string;
  at?: Date;
}) {
  return postFinanceJournal({
    idempotencyKey: `wd_req:${input.withdrawId}`,
    bizType: 'withdrawal',
    bizOrderNo: input.withdrawNo,
    operationType: '提现申请冻结',
    relatedWithdrawalId: input.withdrawId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    at: input.at,
    lines: [
      { accountCode: FINANCE_ACCOUNT_CODES.EXPERT_PAYABLE, amountCents: -input.amountCents },
      { accountCode: FINANCE_ACCOUNT_CODES.WITHDRAW_TRANSIT, amountCents: input.amountCents }
    ]
  });
}

export async function postWithdrawalRejected(input: {
  withdrawId: string;
  withdrawNo: string;
  amountCents: number;
  operatorId?: string;
  operatorName?: string;
  at?: Date;
}) {
  return postFinanceJournal({
    idempotencyKey: `wd_reject:${input.withdrawId}`,
    bizType: 'withdrawal',
    bizOrderNo: input.withdrawNo,
    operationType: '提现驳回退回',
    relatedWithdrawalId: input.withdrawId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    at: input.at,
    lines: [
      { accountCode: FINANCE_ACCOUNT_CODES.WITHDRAW_TRANSIT, amountCents: -input.amountCents },
      { accountCode: FINANCE_ACCOUNT_CODES.EXPERT_PAYABLE, amountCents: input.amountCents }
    ]
  });
}

export async function postWithdrawalPaid(input: {
  withdrawId: string;
  withdrawNo: string;
  amountCents: number;
  feeCents: number;
  operatorId?: string;
  operatorName?: string;
  at?: Date;
}) {
  const fee = Math.max(0, input.feeCents);
  const net = Math.max(0, input.amountCents - fee);
  return postFinanceJournal({
    idempotencyKey: `wd_paid:${input.withdrawId}`,
    bizType: 'withdrawal',
    bizOrderNo: input.withdrawNo,
    operationType: '提现打款出账',
    relatedWithdrawalId: input.withdrawId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    remark: `手续费 ¥${(fee / 100).toFixed(2)} · 实付 ¥${(net / 100).toFixed(2)}`,
    at: input.at,
    lines: [
      { accountCode: FINANCE_ACCOUNT_CODES.WITHDRAW_TRANSIT, amountCents: -input.amountCents },
      ...(net > 0
        ? [{ accountCode: FINANCE_ACCOUNT_CODES.WITHDRAW_PAID, amountCents: net } as JournalLine]
        : []),
      ...(fee > 0
        ? [{ accountCode: FINANCE_ACCOUNT_CODES.WITHDRAW_FEE, amountCents: fee } as JournalLine]
        : [])
    ]
  });
}

/** 从历史订单/提现补记账（幂等） */
export async function backfillFinanceJournals() {
  await ensureFinanceAccounts();
  let posted = 0;

  const escrowed = await prisma.customOrder.findMany({
    where: {
      paymentStatus: { in: ['escrowed', 'released', 'settled'] },
      paidAt: { not: null }
    },
    select: {
      id: true,
      orderNo: true,
      priceCents: true,
      paymentChannel: true,
      paymentId: true,
      paidAt: true,
      escrowedAt: true
    }
  });
  for (const o of escrowed) {
    try {
      await postEscrowReceived({
        orderId: o.id,
        orderNo: o.orderNo,
        amountCents: o.priceCents,
        channel: o.paymentChannel || 'wechat',
        paymentId: o.paymentId || undefined,
        operatorName: 'system_backfill',
        at: o.escrowedAt || o.paidAt || undefined
      });
      posted += 1;
    } catch {
      /* ignore */
    }
  }

  const settled = await prisma.customOrder.findMany({
    where: { settlementStatus: 'settled' },
    select: {
      id: true,
      orderNo: true,
      priceCents: true,
      platformFeeCents: true,
      creatorPayoutCents: true,
      settledAt: true
    }
  });
  for (const o of settled) {
    const fee =
      o.platformFeeCents > 0
        ? o.platformFeeCents
        : Math.round(o.priceCents * 0.1);
    const payout =
      o.creatorPayoutCents > 0 ? o.creatorPayoutCents : Math.max(0, o.priceCents - fee);
    try {
      await postOrderSettlement({
        orderId: o.id,
        orderNo: o.orderNo,
        priceCents: o.priceCents,
        platformFeeCents: fee,
        creatorPayoutCents: payout,
        operatorName: 'system_backfill',
        at: o.settledAt || undefined
      });
      posted += 1;
    } catch {
      /* ignore */
    }
  }

  const withdrawals = await prisma.withdrawal.findMany({
    orderBy: { createdAt: 'asc' }
  });
  for (const w of withdrawals) {
    try {
      await postWithdrawalRequested({
        withdrawId: w.id,
        withdrawNo: w.withdrawNo,
        amountCents: w.amountCents,
        operatorName: 'system_backfill',
        at: w.createdAt
      });
      posted += 1;
    } catch {
      /* ignore */
    }
    if (w.status === 'rejected') {
      try {
        await postWithdrawalRejected({
          withdrawId: w.id,
          withdrawNo: w.withdrawNo,
          amountCents: w.amountCents,
          operatorId: w.reviewedBy || undefined,
          operatorName: 'system_backfill',
          at: w.processedAt || w.reviewedAt || undefined
        });
        posted += 1;
      } catch {
        /* ignore */
      }
    }
    if (w.status === 'paid' || w.status === 'succeeded') {
      try {
        await postWithdrawalPaid({
          withdrawId: w.id,
          withdrawNo: w.withdrawNo,
          amountCents: w.amountCents,
          feeCents: w.feeCents,
          operatorId: w.reviewedBy || undefined,
          operatorName: 'system_backfill',
          at: w.processedAt || undefined
        });
        posted += 1;
      } catch {
        /* ignore */
      }
    }
  }

  return { posted };
}

export async function listFinanceLedgerEntries(input: {
  accountId?: string;
  bizOrderNo?: string;
  flowNo?: string;
  bizType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
}) {
  return prisma.financeLedgerEntry.findMany({
    where: {
      ...(input.accountId ? { accountId: input.accountId } : {}),
      ...(input.bizOrderNo
        ? { bizOrderNo: { contains: input.bizOrderNo } }
        : {}),
      ...(input.flowNo ? { flowNo: { contains: input.flowNo } } : {}),
      ...(input.bizType ? { bizType: input.bizType } : {}),
      ...((input.dateFrom || input.dateTo) && {
        createdAt: {
          ...(input.dateFrom ? { gte: input.dateFrom } : {}),
          ...(input.dateTo ? { lte: input.dateTo } : {})
        }
      })
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: input.take || 200,
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
      journal: {
        select: {
          id: true,
          operatorName: true,
          operatorId: true,
          remark: true,
          relatedOrderId: true,
          relatedWithdrawalId: true
        }
      }
    }
  });
}