import { prisma } from '../lib/prisma';

export const FINANCE_SETTINGS_ID = 'default';
export const DEFAULT_FALLBACK_FEE_RATE_BPS = 1000; // 10%
export const DEFAULT_ACCEPTANCE_DAYS = 7;
export const DEFAULT_SETTLEMENT_HOLD_HOURS = 24;
export const DEFAULT_PENDING_HOLD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type FinanceSettingsRow = {
  id: string;
  fallbackFeeRateBps: number;
  acceptanceDays: number;
  settlementHoldHours: number;
  pendingHoldDays: number;
  updatedAt: Date;
};

export type FeeRatePeriodRow = {
  id: string;
  startAt: Date;
  endAt: Date;
  rateBps: number;
  note: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function bpsToRate(bps: number) {
  return Math.max(0, bps) / 10000;
}

export function rateToBps(rate: number) {
  return Math.round(Math.max(0, rate) * 10000);
}

export function formatBpsPercent(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

export async function ensureFinanceSettings(): Promise<FinanceSettingsRow> {
  const existing = await prisma.financeSettings.findUnique({
    where: { id: FINANCE_SETTINGS_ID }
  });
  if (existing) return existing;
  return prisma.financeSettings.create({
    data: {
      id: FINANCE_SETTINGS_ID,
      fallbackFeeRateBps: DEFAULT_FALLBACK_FEE_RATE_BPS,
      acceptanceDays: DEFAULT_ACCEPTANCE_DAYS,
      settlementHoldHours: DEFAULT_SETTLEMENT_HOLD_HOURS,
      pendingHoldDays: DEFAULT_PENDING_HOLD_DAYS
    }
  });
}

export async function getFinanceSettings(): Promise<FinanceSettingsRow> {
  return ensureFinanceSettings();
}

export async function updateFinanceSettings(input: {
  fallbackFeeRateBps?: number;
  acceptanceDays?: number;
  settlementHoldHours?: number;
  pendingHoldDays?: number;
}): Promise<FinanceSettingsRow> {
  await ensureFinanceSettings();
  const data: Record<string, number> = {};
  if (input.fallbackFeeRateBps !== undefined) {
    if (!Number.isInteger(input.fallbackFeeRateBps) || input.fallbackFeeRateBps < 0 || input.fallbackFeeRateBps > 10000) {
      throw new Error('托底费率须为 0–10000 的万分比整数（1000 = 10%）');
    }
    data.fallbackFeeRateBps = input.fallbackFeeRateBps;
  }
  if (input.acceptanceDays !== undefined) {
    if (!Number.isInteger(input.acceptanceDays) || input.acceptanceDays < 1 || input.acceptanceDays > 90) {
      throw new Error('用户验收天数须为 1–90 的整数');
    }
    data.acceptanceDays = input.acceptanceDays;
  }
  if (input.settlementHoldHours !== undefined) {
    if (
      !Number.isInteger(input.settlementHoldHours) ||
      input.settlementHoldHours < 0 ||
      input.settlementHoldHours > 720
    ) {
      throw new Error('验收后观察期须为 0–720 小时');
    }
    data.settlementHoldHours = input.settlementHoldHours;
  }
  if (input.pendingHoldDays !== undefined) {
    if (!Number.isInteger(input.pendingHoldDays) || input.pendingHoldDays < 0 || input.pendingHoldDays > 90) {
      throw new Error('待提现冻结天数须为 0–90 的整数');
    }
    data.pendingHoldDays = input.pendingHoldDays;
  }
  return prisma.financeSettings.update({
    where: { id: FINANCE_SETTINGS_ID },
    data
  });
}

export async function getAcceptanceDeadlineFromNow(from = new Date()) {
  const s = await getFinanceSettings();
  return {
    deadline: new Date(from.getTime() + s.acceptanceDays * DAY_MS),
    acceptanceDays: s.acceptanceDays
  };
}

export async function getSettlementEligibleFromNow(from = new Date()) {
  const s = await getFinanceSettings();
  return {
    eligibleAt: new Date(from.getTime() + s.settlementHoldHours * HOUR_MS),
    settlementHoldHours: s.settlementHoldHours
  };
}

export async function getPendingHoldMs() {
  const s = await getFinanceSettings();
  return s.pendingHoldDays * DAY_MS;
}

/** 区间是否重叠：[start, end) 左闭右开 */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export async function assertNoFeePeriodOverlap(input: {
  startAt: Date;
  endAt: Date;
  excludeId?: string;
}) {
  if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime())) {
    throw new Error('开始时间不合法');
  }
  if (!(input.endAt instanceof Date) || Number.isNaN(input.endAt.getTime())) {
    throw new Error('结束时间不合法');
  }
  if (input.startAt.getTime() >= input.endAt.getTime()) {
    throw new Error('开始时间必须早于结束时间（区间为左闭右开）');
  }

  const periods = await prisma.platformFeeRatePeriod.findMany({
    where: {
      enabled: true,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {})
    }
  });

  for (const p of periods) {
    if (intervalsOverlap(input.startAt, input.endAt, p.startAt, p.endAt)) {
      throw new Error(
        `与已有时段重叠：${p.startAt.toISOString()} ~ ${p.endAt.toISOString()}（${formatBpsPercent(p.rateBps)}）`
      );
    }
  }
}

export async function listFeeRatePeriods() {
  return prisma.platformFeeRatePeriod.findMany({
    orderBy: [{ startAt: 'desc' }, { id: 'desc' }]
  });
}

export async function createFeeRatePeriod(input: {
  startAt: Date;
  endAt: Date;
  rateBps: number;
  note?: string;
  enabled?: boolean;
}) {
  if (!Number.isInteger(input.rateBps) || input.rateBps < 0 || input.rateBps > 10000) {
    throw new Error('费率须为 0–10000 的万分比整数（1000 = 10%）');
  }
  const enabled = input.enabled !== false;
  if (enabled) {
    await assertNoFeePeriodOverlap({ startAt: input.startAt, endAt: input.endAt });
  }
  return prisma.platformFeeRatePeriod.create({
    data: {
      id: `fee_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      startAt: input.startAt,
      endAt: input.endAt,
      rateBps: input.rateBps,
      note: input.note || '',
      enabled
    }
  });
}

export async function updateFeeRatePeriod(
  id: string,
  input: {
    startAt?: Date;
    endAt?: Date;
    rateBps?: number;
    note?: string;
    enabled?: boolean;
  }
) {
  const existing = await prisma.platformFeeRatePeriod.findUnique({ where: { id } });
  if (!existing) throw new Error('费率时段不存在');

  const startAt = input.startAt ?? existing.startAt;
  const endAt = input.endAt ?? existing.endAt;
  const rateBps = input.rateBps ?? existing.rateBps;
  const enabled = input.enabled ?? existing.enabled;

  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new Error('费率须为 0–10000 的万分比整数（1000 = 10%）');
  }
  if (enabled) {
    await assertNoFeePeriodOverlap({ startAt, endAt, excludeId: id });
  }

  return prisma.platformFeeRatePeriod.update({
    where: { id },
    data: {
      startAt,
      endAt,
      rateBps,
      note: input.note !== undefined ? input.note : existing.note,
      enabled
    }
  });
}

export async function deleteFeeRatePeriod(id: string) {
  const existing = await prisma.platformFeeRatePeriod.findUnique({ where: { id } });
  if (!existing) throw new Error('费率时段不存在');
  await prisma.platformFeeRatePeriod.delete({ where: { id } });
  return existing;
}

/**
 * 按支付成功时间解析平台服务费率（小数，如 0.1）。
 * 匹配启用时段 [startAt, endAt)；无匹配则用托底。
 */
export async function resolvePlatformFeeRate(at: Date = new Date()): Promise<{
  rate: number;
  rateBps: number;
  source: 'period' | 'fallback';
  periodId?: string;
}> {
  const settings = await getFinanceSettings();
  const period = await prisma.platformFeeRatePeriod.findFirst({
    where: {
      enabled: true,
      startAt: { lte: at },
      endAt: { gt: at }
    },
    orderBy: { startAt: 'desc' }
  });
  if (period) {
    return {
      rate: bpsToRate(period.rateBps),
      rateBps: period.rateBps,
      source: 'period',
      periodId: period.id
    };
  }
  return {
    rate: bpsToRate(settings.fallbackFeeRateBps),
    rateBps: settings.fallbackFeeRateBps,
    source: 'fallback'
  };
}

export async function platformFeeCentsForPrice(priceCents: number, at: Date = new Date()) {
  const { rate, rateBps, source, periodId } = await resolvePlatformFeeRate(at);
  return {
    feeCents: Math.round(Math.max(0, priceCents) * rate),
    rate,
    rateBps,
    source,
    periodId
  };
}