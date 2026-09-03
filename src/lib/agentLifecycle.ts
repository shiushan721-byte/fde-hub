export const AGENT_LIFECYCLE_NOTICE =
  '智能体一旦有用户使用，将无法删除，只能从市场撤回为「仅自己可用」。定价可后续调整，但已购用户不受影响。';

export const AGENT_PRICE_CHANGE_NOTICE =
  '新价格仅对后续购买生效，已购用户仍按原价与原套餐使用。';

/** 创作者侧：是否已有真实用户使用过，用过则禁止删除 */
export function creatorAgentHasBeenUsed(agent: {
  status?: string;
  paidOrdersCount?: number;
  tokensConsumed?: number;
  usageCount?: string | number;
  trialsCount?: number;
}): boolean {
  if ((agent.paidOrdersCount || 0) > 0) return true;
  if ((agent.trialsCount || 0) > 0) return true;
  if (parseCount(agent.usageCount) > 0) return true;
  const live = agent.status === 'published' || agent.status === 'offline';
  if (live && (agent.tokensConsumed || 0) > 0) return true;
  return false;
}

function parseCount(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  if (!raw) return 0;
  const s = String(raw).trim().toLowerCase().replace(/,/g, '');
  if (!s) return 0;
  if (s.endsWith('k')) {
    const n = parseFloat(s.slice(0, -1));
    return Number.isFinite(n) ? Math.max(0, Math.round(n * 1000)) : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}
