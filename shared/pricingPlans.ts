export type PreferredPlan = 'monthly' | 'annual' | 'buyout';

export type PricingPlansPayload = {
  monthlyPrice: number;
  annualPrice: number;
  buyoutPrice: number;
  isFree: boolean;
  preferredPlan: PreferredPlan;
};

function toNonNegInt(raw: unknown, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export function normalizePricingPlans(raw: unknown): PricingPlansPayload {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const isFree = Boolean(row.isFree);
  const preferredPlan: PreferredPlan =
    row.preferredPlan === 'monthly' || row.preferredPlan === 'buyout' ? row.preferredPlan : 'annual';
  return {
    isFree,
    monthlyPrice: isFree ? 0 : toNonNegInt(row.monthlyPrice),
    annualPrice: isFree ? 0 : toNonNegInt(row.annualPrice),
    buyoutPrice: isFree ? 0 : toNonNegInt(row.buyoutPrice),
    preferredPlan
  };
}

export function validatePaidPlans(plans: PricingPlansPayload): string | null {
  if (plans.isFree) return null;
  if (plans.monthlyPrice < 1) return '按月价格须大于 0';
  if (plans.annualPrice < 1) return '按年价格须大于 0';
  if (plans.buyoutPrice < 1) return '买断价格须大于 0';
  return null;
}

export function catalogPriceYuan(plans: PricingPlansPayload): number {
  return plans.isFree ? 0 : plans.monthlyPrice;
}

export function pricingFromAgent(agent: {
  price?: number | null;
  pricingPlans?: {
    isFree?: boolean;
    monthlyPrice?: number;
    annualPrice?: number;
    buyoutPrice?: number;
    preferredPlan?: PreferredPlan;
  } | null;
}): PricingPlansPayload {
  const raw = agent.pricingPlans || {};
  const monthly = raw.monthlyPrice ?? agent.price ?? 0;
  const isFree = Boolean(raw.isFree) || monthly <= 0;
  return normalizePricingPlans({
    ...raw,
    isFree,
    monthlyPrice: monthly
  });
}

export function pricingLabel(plans: {
  isFree?: boolean;
  monthlyPrice?: number;
  price?: number;
}): string {
  if (plans.isFree) return '免费';
  const monthly = plans.monthlyPrice || plans.price || 0;
  if (monthly <= 0) return '免费';
  return `￥${monthly}/月起`;
}
