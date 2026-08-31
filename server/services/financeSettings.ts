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

/** 按支付成功时间解析平台服务费率（小数，如 0.1）。 */
export async function resolvePlatformFeeRate(_at: Date = new Date()): Promise<{
  rate: number;
  rateBps: number;
  source: 'fallback';
}> {
  const settings = await getFinanceSettings();
  return {
    rate: bpsToRate(settings.fallbackFeeRateBps),
    rateBps: settings.fallbackFeeRateBps,
    source: 'fallback'
  };
}

export async function platformFeeCentsForPrice(priceCents: number, at: Date = new Date()) {
  const { rate, rateBps, source } = await resolvePlatformFeeRate(at);
  return {
    feeCents: Math.round(Math.max(0, priceCents) * rate),
    rate,
    rateBps,
    source
  };
}