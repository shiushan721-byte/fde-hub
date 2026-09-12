/** 铃铛消息三类：动态 / 通知 / 咨询。前后台共用，新增 type 时同步补这里。 */

export type InboxChannel = 'activity' | 'notice' | 'consult';

export const ACTIVITY_NOTIFICATION_TYPES = [
  'agent_like',
  'agent_comment',
  'agent_comment_reply',
  'agent_favorite',
  'expert_follow',
  'showcase_like',
  'showcase_comment',
  'showcase_reply',
  'showcase_featured'
] as const;

export const NOTICE_NOTIFICATION_TYPES = [
  'comment_report_submitted',
  'comment_report_dismissed',
  'comment_report_removed',
  'agent_review_approved',
  'agent_review_rejected',
  'agent_offline',
  'expert_application_submitted',
  'expert_application_approved',
  'expert_application_rejected',
  'expert_application_supplement',
  'onboarding',
  'upgrade',
  'realname_verified',
  'realname_rejected',
  'catalog_purchase_paid',
  'adapter_purchase_paid',
  'order_settled_notice',
  'withdrawal_paid',
  'withdrawal_rejected'
] as const;

export const CONSULT_NOTIFICATION_TYPES = [
  'consult_submitted',
  'consult_contacted',
  'consult_replied',
  'consult_closed',
  'custom_order_pending_quote',
  'delivery_proposal_ready',
  'proposal_confirmed',
  'proposal_rejected',
  'proposal_revision_requested',
  'custom_order_escrowed',
  'delivery_ready',
  'delivery_review_approved',
  'delivery_review_rejected',
  'revision_requested',
  'order_accepted',
  'order_settled',
  'order_auto_accepted',
  'order_closed_payment_timeout',
  'dispute_opened',
  'dispute_resolved',
  'platform_intervention',
  'acceptance_reminder_day1',
  'acceptance_reminder_day5',
  'acceptance_reminder_day7'
] as const;

export type ActivityNotificationType = (typeof ACTIVITY_NOTIFICATION_TYPES)[number];
export type NoticeNotificationType = (typeof NOTICE_NOTIFICATION_TYPES)[number];
export type ConsultNotificationType = (typeof CONSULT_NOTIFICATION_TYPES)[number];
export type InboxNotificationType =
  | ActivityNotificationType
  | NoticeNotificationType
  | ConsultNotificationType;
