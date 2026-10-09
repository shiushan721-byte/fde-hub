export type CatalogPlan = 'one_time';

export const MAX_TRIAL_DAYS = 90;

export type PricingPlansPayload = {
  price: number;
  isFree: boolean;
  /** 0 表示不提供试用。已有智能体缺该字段时视为 0。 */
  trialDays: number;
};

function trialDaysFromRaw(raw: unknown) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function toNonNegInt(raw: unknown, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

function oneTimePriceFromRaw(row: Record<string, unknown>, fallback = 0) {
  if (row.price != null && Number(row.price) > 0) return toNonNegInt(row.price, fallback);
  if (row.monthlyPrice != null && Number(row.monthlyPrice) > 0) return toNonNegInt(row.monthlyPrice, fallback);
  if (row.buyoutPrice != null && Number(row.buyoutPrice) > 0) return toNonNegInt(row.buyoutPrice, fallback);
  if (row.annualPrice != null && Number(row.annualPrice) > 0) return toNonNegInt(row.annualPrice, fallback);
  return toNonNegInt(fallback);
}

export function normalizePricingPlans(raw: unknown): PricingPlansPayload {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const isFree = Boolean(row.isFree);
  return {
    isFree,
    price: isFree ? 0 : oneTimePriceFromRaw(row),
    trialDays: isFree ? 0 : trialDaysFromRaw(row.trialDays)
  };
}

export function validatePaidPlans(plans: PricingPlansPayload): string | null {
  if (plans.isFree) return null;
  if (plans.price < 1) return '售价须大于 0';
  if (!Number.isInteger(plans.trialDays) || plans.trialDays > MAX_TRIAL_DAYS) {
    return `试用天数须为 0 到 ${MAX_TRIAL_DAYS} 的整数`;
  }
  return null;
}

export function catalogPriceYuan(plans: PricingPlansPayload): number {
  return plans.isFree ? 0 : plans.price;
}

export function pricingFromAgent(agent: {
  price?: number | null;
  pricingPlans?: {
    isFree?: boolean;
    price?: number;
    monthlyPrice?: number;
    annualPrice?: number;
    buyoutPrice?: number;
    trialDays?: number;
  } | null;
}): PricingPlansPayload {
  const raw = agent.pricingPlans || {};
  const plans = normalizePricingPlans({
    ...raw,
    price: raw.price ?? raw.monthlyPrice ?? raw.buyoutPrice ?? raw.annualPrice ?? agent.price ?? 0,
    isFree: Boolean(raw.isFree),
    trialDays: raw.trialDays
  });
  if (!raw.isFree && plans.price <= 0) {
    const fallback = toNonNegInt(agent.price);
    if (fallback <= 0) return { isFree: true, price: 0, trialDays: 0 };
    return { isFree: false, price: fallback, trialDays: plans.trialDays };
  }
  return plans;
}

export function pricingLabel(plans: {
  isFree?: boolean;
  price?: number;
  monthlyPrice?: number;
}): string {
  if (plans.isFree) return '免费';
  const price = plans.price || plans.monthlyPrice || 0;
  if (price <= 0) return '免费';
  return `￥${price}`;
}
