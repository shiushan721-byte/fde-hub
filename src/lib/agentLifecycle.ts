export const AGENT_LIFECYCLE_NOTICE =
  '智能体一旦有用户使用，将无法删除，只能从市场撤回为「仅自己可用」。定价可后续调整，但已购用户不受影响。';

export const AGENT_PRICE_CHANGE_NOTICE =
  '新价格仅对后续购买生效，已购用户仍按原价使用。';

export const AGENT_PRIVATE_PUBLISH_HINT =
  '私有发布无需平台审核，仅你自己可使用，也可用分享链接发给指定的人。之后若要进入市场，必须提交公开审核。';

export const AGENT_PUBLIC_PUBLISH_HINT =
  '公开上架会进入智能体市场，须先通过平台审核。审核通过前不会出现在市场列表中。';

export type CreatorListingStatus = 'published' | 'draft' | 'under_review' | 'offline';

export function creatorListingLabel(status: string): string {
  switch (status) {
    case 'published':
      return '公开上架';
    case 'under_review':
    case 'in_review':
      return '公开审核中';
    case 'offline':
      return '私有';
    case 'draft':
      return '草稿';
    default:
      return '未上架';
  }
}

export function creatorListingBadgeClass(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'under_review':
    case 'in_review':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'offline':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'draft':
      return 'bg-slate-50 text-slate-500 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
}

export function visibilityFromCreatorStatus(status?: string): 'private' | 'public' {
  return status === 'published' || status === 'under_review' || status === 'in_review'
    ? 'public'
    : 'private';
}

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
