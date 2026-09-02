import type { HellomeAgentItem } from '../data/mockData';

export type AgentShareLinkPayload = {
  public: boolean;
  token: string | null;
  path: string;
};

export function buildAgentShareUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized}`;
}

export function agentShareHash(agentId: string, share = '') {
  const id = encodeURIComponent(agentId);
  return share ? `/agent/${id}?share=${encodeURIComponent(share)}` : `/agent/${id}`;
}

export function parseAgentShareHash(hash: string) {
  const raw = hash.replace(/^#/, '');
  const [pathPart, queryPart] = raw.split('?');
  const match = pathPart.match(/^\/agent\/([^/]+)$/);
  if (!match) return null;
  const share = new URLSearchParams(queryPart || '').get('share') || '';
  return { id: decodeURIComponent(match[1]), share };
}

export function clearAgentShareHash() {
  if (typeof window === 'undefined') return;
  if (!parseAgentShareHash(window.location.hash)) return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', next || '/');
}

export function qrCodeImageUrl(data: string, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

export function toHellomeAgentItem(raw: Record<string, unknown>): HellomeAgentItem {
  return {
    id: String(raw.id || ''),
    title: String(raw.title || ''),
    desc: String(raw.desc || raw.description || raw.subtitle || ''),
    category: String(raw.category || ''),
    coverImage: String(raw.coverImage || ''),
    gradient: String(raw.gradient || 'from-slate-800 to-slate-950'),
    tagColor: String(raw.tagColor || 'blue'),
    badge: raw.badge ? String(raw.badge) : undefined,
    canFDECustom: raw.canFDECustom !== false,
    authorName: raw.authorName ? String(raw.authorName) : undefined,
    authorId: raw.authorId ? String(raw.authorId) : undefined,
    price: typeof raw.price === 'number' ? raw.price : undefined,
    pricingPlans:
      raw.pricingPlans && typeof raw.pricingPlans === 'object'
        ? (raw.pricingPlans as HellomeAgentItem['pricingPlans'])
        : undefined,
    likesCount: (raw.likesCount as string | number) ?? '0',
    favoritesCount: (raw.favoritesCount as string | number) ?? '0',
    commentsCount: (raw.commentsCount as string | number) ?? '0',
    sharesCount: (raw.sharesCount as string | number) ?? '0',
    usageCount: raw.usageCount ? String(raw.usageCount) : undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined
  };
}
