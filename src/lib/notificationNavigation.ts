import type { CreatorCenterTab } from '../components/CreatorCenterView';

export type NotificationNavigationTarget =
  | { route: 'orders'; orderId?: string }
  | { route: 'order-center' }
  | { route: 'workspace'; instanceId?: string }
  | { route: 'creator-center'; tab: CreatorCenterTab; orderId?: string }
  | { route: 'inspiration'; showcaseId: string }
  | { route: 'agent'; agentId: string; share?: string };

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

function inferTargetFromContext(
  type: string,
  payload: Record<string, unknown>
): NotificationNavigationTarget | null {
  if (type === 'showcase_like') {
    const showcaseId = stringOrUndefined(payload.showcaseId);
    if (showcaseId) return { route: 'inspiration', showcaseId };
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

  const orderId = stringOrUndefined(payload.orderId);
  const instanceId = stringOrUndefined(payload.instanceId);

  if (type === 'delivery_ready' && instanceId) {
    return { route: 'workspace', instanceId };
  }

  if (orderId) {
    const creatorTypes = new Set([
      'custom_order_pending_quote',
      'proposal_confirmed',
      'proposal_rejected',
      'proposal_revision_requested',
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

  if (!link.trim()) {
    return inferTargetFromContext(type, payload);
  }

  return null;
}

export function defaultLeadNavigationTarget(): NotificationNavigationTarget {
  return { route: 'orders' };
}
