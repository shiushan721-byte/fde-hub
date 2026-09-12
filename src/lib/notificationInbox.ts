import type { CustomerLeadItem } from '../types/creator';
import { defaultLeadNavigationTarget, parseNotificationLink, type NotificationNavigationTarget } from './notificationNavigation';
import {
  ACTIVITY_NOTIFICATION_TYPES,
  CONSULT_NOTIFICATION_TYPES,
  NOTICE_NOTIFICATION_TYPES
} from '../../shared/inboxNotificationTypes';

export type InboxChannel = 'activity' | 'notice' | 'consult';
export type InboxReadFilter = 'all' | 'unread' | 'read';

export const INBOX_TABS: Array<{ key: InboxChannel; label: string }> = [
  { key: 'activity', label: '动态' },
  { key: 'notice', label: '通知' },
  { key: 'consult', label: '咨询' }
];

export interface UserNotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  createdAt?: string;
  agentTitle?: string;
  unread?: boolean;
  kind: 'submitted' | 'creator_reply' | 'status' | 'ops_review' | 'like';
  channel: InboxChannel;
  link?: string;
  type?: string;
  payload?: Record<string, unknown>;
  navigationTarget?: NotificationNavigationTarget | null;
}

export type InboxApiRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
};

const ACTIVITY_TYPES = new Set<string>(ACTIVITY_NOTIFICATION_TYPES);

const NOTICE_TYPES = new Set<string>(NOTICE_NOTIFICATION_TYPES);

const CONSULT_TYPES = new Set<string>(CONSULT_NOTIFICATION_TYPES);

export function classifyInboxChannel(type?: string): InboxChannel {
  const raw = (type || '').trim();
  if (!raw) return 'consult';
  if (ACTIVITY_TYPES.has(raw) || raw.includes('like') || raw.includes('follow') || raw.includes('favorite')) {
    return 'activity';
  }
  if (raw.startsWith('comment_report') || raw.startsWith('agent_review') || raw.startsWith('expert_application')) {
    return 'notice';
  }
  if (raw === 'order_settled_notice' || raw.startsWith('withdrawal_') || raw.startsWith('catalog_') || raw.startsWith('adapter_')) {
    return 'notice';
  }
  if (
    raw.startsWith('custom_order') ||
    raw.startsWith('delivery') ||
    raw.startsWith('proposal') ||
    raw.startsWith('order_') ||
    raw.startsWith('dispute') ||
    raw.startsWith('acceptance_reminder') ||
    raw === 'revision_requested' ||
    raw === 'platform_intervention'
  ) {
    return 'consult';
  }
  if (NOTICE_TYPES.has(raw) || raw.includes('offline') || raw.includes('onboarding') || raw.includes('realname')) {
    return 'notice';
  }
  if (CONSULT_TYPES.has(raw) || raw.includes('consult') || raw.includes('quote')) {
    return 'consult';
  }
  return 'notice';
}

export function formatInboxTime(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function mapApiTypeToKind(type: string): UserNotificationItem['kind'] {
  if (type.includes('like') || type.includes('featured') || type.includes('favorite')) return 'like';
  if (type.includes('comment_report')) return 'submitted';
  if (
    type.includes('review') ||
    type.includes('agent_review') ||
    type.includes('rejected') ||
    type.includes('approved') ||
    type.includes('offline') ||
    type.includes('intervention') ||
    type.includes('application')
  ) {
    return 'ops_review';
  }
  if (type.includes('reply') || type.includes('comment')) return 'creator_reply';
  if (type.includes('status') || type.includes('accepted')) return 'status';
  return 'submitted';
}

export function mapApiNotification(n: InboxApiRow): UserNotificationItem {
  const payload = n.payload && typeof n.payload === 'object' ? n.payload : {};
  const createdAt = typeof n.createdAt === 'string' ? n.createdAt : String(n.createdAt || '');
  return {
    id: n.id,
    kind: mapApiTypeToKind(n.type),
    channel: classifyInboxChannel(n.type),
    title: n.title,
    body: n.body,
    time: formatInboxTime(createdAt),
    createdAt,
    agentTitle: typeof payload.agentTitle === 'string' ? payload.agentTitle : undefined,
    unread: !n.read,
    link: n.link,
    type: n.type,
    payload,
    navigationTarget: parseNotificationLink(n.link || '', { type: n.type, payload })
  };
}

export type ConsultNextAction = {
  label: string;
  hint: string;
};

/** 咨询是待办，不是聊天：每条提醒对应一个下一步动作 */
export function consultNextAction(item: Pick<UserNotificationItem, 'type' | 'title'>): ConsultNextAction {
  const type = item.type || '';
  const title = item.title || '';

  if (type === 'delivery_proposal_ready') return { label: '确认方案', hint: '查看需求并确认或退回方案' };
  if (type === 'proposal_rejected' || type === 'proposal_revision_requested') {
    return { label: '修改方案', hint: '按反馈调整后重新发起交付方案' };
  }
  if (type === 'custom_order_pending_quote') return { label: '发起方案', hint: '根据需求发起定制交付方案' };
  if (type === 'proposal_confirmed') return { label: '查看订单', hint: '方案已确认，等待付款' };
  if (type === 'custom_order_escrowed') return { label: '去交付', hint: '资金已托管，开始履约交付' };
  if (type === 'delivery_ready' || type.startsWith('acceptance_reminder')) {
    return { label: '去验收', hint: '专属智能体已送达，请验收' };
  }
  if (type === 'delivery_review_approved') return { label: '查看订单', hint: '交付已通过审核并推送给客户' };
  if (type === 'delivery_review_rejected') return { label: '去处理', hint: '按驳回原因修改后重新提交' };
  if (type === 'revision_requested') return { label: '去修改', hint: '客户申请修改交付，请重新提交' };
  if (type === 'order_accepted' || type === 'order_auto_accepted') {
    return { label: '查看订单', hint: '验收完成，进入结算' };
  }
  if (type === 'order_settled') return { label: '查看收益', hint: '定制订单已结算' };
  if (type === 'order_closed_payment_timeout') return { label: '查看', hint: '超时未付款，订单已关闭' };
  if (type === 'dispute_opened') return { label: '查看争议', hint: '客户发起争议，请配合平台处理' };
  if (type === 'dispute_resolved' || type === 'platform_intervention') {
    return { label: '查看订单', hint: '平台已处理，请查看结果' };
  }
  if (type === 'consult_closed') return { label: '查看', hint: '咨询已关闭，不会进入定制订单' };
  if (type === 'consult_submitted' && title.includes('新的定制咨询')) {
    return { label: '去联系', hint: '查看需求后决定跟进或关闭' };
  }
  if (type === 'consult_submitted') return { label: '查看需求', hint: '等待创作者跟进，也可关闭咨询' };
  if (type === 'consult_contacted' || type === 'consult_replied') {
    return { label: '去处理', hint: '查看需求，发起方案或关闭咨询' };
  }
  return { label: '去处理', hint: '查看需求并完成下一步' };
}

export function leadNotifications(leads: CustomerLeadItem[]): UserNotificationItem[] {
  return leads.map((lead) => ({
    id: `${lead.id}_submitted`,
    kind: 'submitted',
    channel: 'consult',
    type: 'consult_submitted',
    title: '定制需求已保存',
    body: lead.agentId
      ? `「${lead.agentTitle}」已提交给创作者。有进展时会在此提醒你。`
      : '已向专家提交咨询需求。有进展时会在此提醒你。',
    time: lead.lastActivity,
    createdAt: lead.lastActivity,
    agentTitle: lead.agentTitle,
    unread: true,
    navigationTarget: defaultLeadNavigationTarget(lead.id)
  }));
}

export function mergeInboxItems(
  apiItems: UserNotificationItem[],
  leads: CustomerLeadItem[],
  localReadIds: Set<string>
): UserNotificationItem[] {
  const apiIds = new Set(apiItems.map((n) => n.id));
  const extras = leadNotifications(leads).filter((item) => !apiIds.has(item.id));
  return [...apiItems, ...extras].map((item) =>
    localReadIds.has(item.id) ? { ...item, unread: false } : item
  );
}

export function unreadByChannel(items: UserNotificationItem[]): Record<InboxChannel, number> {
  const counts: Record<InboxChannel, number> = { activity: 0, notice: 0, consult: 0 };
  for (const item of items) {
    if (item.unread) counts[item.channel] += 1;
  }
  return counts;
}
