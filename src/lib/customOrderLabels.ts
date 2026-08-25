export type BuyerOrderStatus =
  | 'consulting'
  | 'pending_quote'
  | 'awaiting_proposal_confirm'
  | 'awaiting_payment'
  | 'paid_pending_start'
  | 'escrowed'
  | 'in_development'
  | 'in_review'
  | 'revision'
  | 'pending_acceptance'
  | 'dispute'
  | 'pending_settlement'
  | 'completed'
  | 'closed';

export const buyerStatusText: Record<string, string> = {
  consulting: '咨询中',
  pending_quote: '咨询中',
  awaiting_proposal_confirm: '待确认方案',
  awaiting_payment: '待支付',
  paid_pending_start: '待提交交付',
  escrowed: '待提交交付',
  in_development: '待提交交付',
  in_review: '待提交交付',
  revision: '需修改',
  pending_acceptance: '待验收',
  dispute: '争议处理中',
  pending_settlement: '待结算',
  completed: '已结算',
  closed: '已关闭'
};

export const creatorStatusText: Record<string, string> = {
  consulting: '咨询中',
  pending_quote: '咨询中',
  awaiting_proposal_confirm: '待确认方案',
  awaiting_payment: '待支付',
  paid_pending_start: '待提交交付',
  escrowed: '待提交交付',
  in_development: '待提交交付',
  in_review: '平台审核中',
  revision: '需修改',
  pending_acceptance: '待验收',
  dispute: '争议处理中',
  pending_settlement: '待结算',
  completed: '已完成',
  closed: '已关闭'
};

export const buyerStageText: Record<string, string> = {
  consulting: '咨询沟通',
  pending_quote: '咨询沟通',
  awaiting_proposal_confirm: '方案确认',
  awaiting_payment: '方案确认',
  paid_pending_start: '履约交付',
  escrowed: '履约交付',
  in_development: '履约交付',
  in_review: '履约交付',
  revision: '履约交付',
  pending_acceptance: '验收确认',
  dispute: '争议处理',
  pending_settlement: '结算',
  completed: '已完成',
  closed: '已关闭'
};

export const paymentStatusText: Record<string, string> = {
  none: '未付款',
  pending: '待支付',
  escrowed: '托管中',
  released: '已释放',
  settled: '已结算'
};

export function yuan(cents?: number) {
  if (!cents) return '待报价';
  return `¥${(cents / 100).toFixed(2)}`;
}

export function formatOrderTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'consulting':
    case 'pending_quote':
    case 'awaiting_proposal_confirm':
    case 'awaiting_payment':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'paid_pending_start':
    case 'escrowed':
    case 'in_development':
    case 'in_review':
    case 'revision':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'pending_acceptance':
      return 'bg-violet-50 text-violet-700 ring-violet-200';
    case 'dispute':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'pending_settlement':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'closed':
      return 'bg-slate-50 text-slate-600 ring-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

export type OrderFilterKey = 'all' | 'active' | 'proposal' | 'pay' | 'accept' | 'done';

export type CustomServiceFilterKey =
  | 'all'
  | 'consulting'
  | 'awaiting_proposal_confirm'
  | 'awaiting_payment'
  | 'in_delivery'
  | 'in_review'
  | 'pending_acceptance'
  | 'completed'
  | 'closed';

export const CUSTOM_SERVICE_FILTERS: { key: CustomServiceFilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'consulting', label: '咨询中' },
  { key: 'awaiting_proposal_confirm', label: '待确认方案' },
  { key: 'awaiting_payment', label: '待支付' },
  { key: 'in_delivery', label: '待提交交付' },
  { key: 'in_review', label: '平台审核中' },
  { key: 'pending_acceptance', label: '待验收' },
  { key: 'completed', label: '已完成' },
  { key: 'closed', label: '已关闭/争议中' }
];

/** 买家侧：不展示「平台审核中」，该阶段并入「待提交交付」 */
export const BUYER_CUSTOM_SERVICE_FILTERS: { key: CustomServiceFilterKey; label: string }[] =
  CUSTOM_SERVICE_FILTERS.filter((f) => f.key !== 'in_review');

export function matchesCustomServiceFilter(
  stageKey: string,
  filter: CustomServiceFilterKey
) {
  if (filter === 'all') return true;
  if (filter === 'closed') return stageKey === 'closed' || stageKey === 'dispute';
  return stageKey === filter;
}

export function matchesOrderFilter(status: string, filter: OrderFilterKey) {
  if (filter === 'all') return true;
  if (filter === 'proposal') return status === 'awaiting_proposal_confirm';
  if (filter === 'pay') return status === 'awaiting_payment';
  if (filter === 'accept') return status === 'pending_acceptance';
  if (filter === 'done') return ['completed', 'closed'].includes(status);
  return !['completed', 'closed'].includes(status);
}
