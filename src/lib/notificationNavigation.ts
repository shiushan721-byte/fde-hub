import type { CreatorCenterTab } from '../components/CreatorCenterView';

export type NotificationNavigationTarget =
  | { route: 'orders'; orderId?: string }
  | { route: 'order-center' }
  | { route: 'workspace'; instanceId?: string }
  | { route: 'creator-center'; tab: CreatorCenterTab; orderId?: string }
  | { route: 'inspiration'; showcaseId: string }
  | { route: 'agent'; agentId: string; share?: string }
  | { route: 'expert'; expertId: string }
  | { route: 'consult'; dealId: string; orderId?: string };

export type NavigationFocus = {
  orderId?: string;
  instanceId?: string;
};

function normalizeCreatorTab(tab: string | null | undefined): CreatorCenterTab {
  if (!tab) return 'custom-services';
  if (tab === 'orders' || tab === 'customer-leads') return 'custom-services';
  if (tab === 'customer-instances') return 'my-agents';
  if (tab === 'realname-verify') return 'my-agents';
  const allowed: CreatorCenterTab[] = [
    'profile-editor',
    'my-agents',
    'custom-services',
    'account'
  ];
  return allowed.includes(tab as CreatorCenterTab) ? (tab as CreatorCenterTab) : 'custom-services';
}

function parsePathAndQuery(raw: string) {
  let path = raw.trim();
  if (!path) return { pathname: '', params: new URLSearchParams() };
  if (path.startsWith('#')) path = path.slice(1);
  if (!path.startsWith('/')) path = `/${path}`;
  const [pathname, search = ''] = path.split('?');
  return { pathname, params: new URLSearchParams(search) };
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function consultDealIdFromPayload(payload: Record<string, unknown>): string | undefined {
  return (
    stringOrUndefined(payload.dealId) ||
    stringOrUndefined(payload.leadId) ||
    stringOrUndefined(payload.orderId)
  );
}

const CONSULT_STAGE_TYPES = new Set([
  'consult_submitted',
  'consult_contacted',
  'consult_replied',
  'consult_closed',
  'custom_order_pending_quote',
  'delivery_proposal_ready',
  'proposal_rejected',
  'proposal_revision_requested'
]);

function inferTargetFromContext(
  type: string,
  payload: Record<string, unknown>
): NotificationNavigationTarget | null {
  if (
    type === 'showcase_like' ||
    type === 'showcase_comment' ||
    type === 'showcase_reply' ||
    type === 'showcase_featured'
  ) {
    const showcaseId = stringOrUndefined(payload.showcaseId);
    if (showcaseId) return { route: 'inspiration', showcaseId };
  }

  if (
    type === 'agent_like' ||
    type === 'agent_comment' ||
    type === 'agent_comment_reply' ||
    type === 'agent_favorite' ||
    type === 'catalog_purchase_paid' ||
    type === 'adapter_purchase_paid'
  ) {
    const agentId = stringOrUndefined(payload.agentId);
    if (agentId) return { route: 'agent', agentId };
  }

  if (type === 'expert_follow') {
    const expertId = stringOrUndefined(payload.expertId);
    if (expertId) return { route: 'expert', expertId };
  }

  if (
    type === 'agent_review_approved' ||
    type === 'agent_review_rejected' ||
    type === 'agent_offline'
  ) {
    const agentId = stringOrUndefined(payload.agentId);
    if (agentId) return { route: 'agent', agentId };
    return { route: 'creator-center', tab: 'my-agents' };
  }

  if (
    type.startsWith('expert_application') ||
    type === 'upgrade' ||
    type === 'onboarding' ||
    type.startsWith('realname_') ||
    type === 'order_settled_notice' ||
    type.startsWith('withdrawal_')
  ) {
    return { route: 'creator-center', tab: 'account' };
  }

  const orderId = stringOrUndefined(payload.orderId);
  const instanceId = stringOrUndefined(payload.instanceId);

  if (CONSULT_STAGE_TYPES.has(type)) {
    const dealId = consultDealIdFromPayload(payload);
    if (dealId) return { route: 'consult', dealId, orderId };
  }

  if (type === 'delivery_ready' && instanceId) {
    return { route: 'workspace', instanceId };
  }

  if (orderId) {
    const creatorTypes = new Set([
      'proposal_confirmed',
      'custom_order_escrowed',
      'delivery_review_approved',
      'order_settled',
      'order_accepted',
      'revision_requested',
      'dispute_opened',
      'order_closed_payment_timeout'
    ]);

    if (creatorTypes.has(type)) {
      return { route: 'creator-center', tab: 'custom-services', orderId };
    }

    if (type === 'delivery_review_rejected') {
      return { route: 'order-center' };
    }

    if (type === 'dispute_resolved') {
      return { route: 'orders', orderId };
    }

    if (type.startsWith('acceptance_reminder_')) {
      return { route: 'orders', orderId };
    }

    return { route: 'orders', orderId };
  }

  if (type.includes('comment_report') && stringOrUndefined(payload.agentId)) {
    return { route: 'agent', agentId: String(payload.agentId) };
  }

  return null;
}

export function parseNotificationLink(
  link: string,
  context?: { type?: string; payload?: Record<string, unknown> }
): NotificationNavigationTarget | null {
  const { pathname, params } = parsePathAndQuery(link);
  const type = context?.type || '';
  const payload = context?.payload || {};

  if (CONSULT_STAGE_TYPES.has(type)) {
    const dealId =
      params.get('dealId') ||
      consultDealIdFromPayload(payload) ||
      params.get('orderId') ||
      stringOrUndefined(payload.orderId);
    if (dealId) {
      return {
        route: 'consult',
        dealId,
        orderId: params.get('orderId') || stringOrUndefined(payload.orderId)
      };
    }
  }

  if (pathname === '/consult') {
    const dealId = params.get('dealId') || consultDealIdFromPayload(payload);
    if (dealId) {
      return {
        route: 'consult',
        dealId,
        orderId: params.get('orderId') || stringOrUndefined(payload.orderId)
      };
    }
  }

  if (pathname === '/orders') {
    return {
      route: 'orders',
      orderId: params.get('orderId') || stringOrUndefined(payload.orderId)
    };
  }

  if (pathname === '/order-center') {
    return { route: 'order-center' };
  }

  if (pathname === '/workspace') {
    return {
      route: 'workspace',
      instanceId: params.get('instanceId') || stringOrUndefined(payload.instanceId)
    };
  }

  if (pathname === '/creator-center') {
    return {
      route: 'creator-center',
      tab: normalizeCreatorTab(params.get('tab')),
      orderId: params.get('orderId') || stringOrUndefined(payload.orderId)
    };
  }

  const inspirationMatch = pathname.match(/^\/inspiration\/([^/]+)$/);
  if (inspirationMatch) {
    return { route: 'inspiration', showcaseId: decodeURIComponent(inspirationMatch[1]) };
  }

  const agentMatch = pathname.match(/^\/agent\/([^/]+)$/);
  if (agentMatch) {
    return {
      route: 'agent',
      agentId: decodeURIComponent(agentMatch[1]),
      share: params.get('share') || undefined
    };
  }

  const expertMatch = pathname.match(/^\/expert\/([^/]+)$/);
  if (expertMatch) {
    return { route: 'expert', expertId: decodeURIComponent(expertMatch[1]) };
  }

  if (!link.trim()) {
    return inferTargetFromContext(type, payload);
  }

  return null;
}

export function defaultLeadNavigationTarget(dealId: string): NotificationNavigationTarget {
  return { route: 'consult', dealId };
}
