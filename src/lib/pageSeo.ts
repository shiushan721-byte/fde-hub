const SITE_NAME = 'HelloMe';
const SITE_URL = 'https://www.hellome.art';
const DEFAULT_DESCRIPTION =
  'HelloMe 是面向个人与企业的交互应用智能体平台，汇集 AI 专家、智能体与真实应用案例。';

export type PublicRoute =
  | { type: 'home' }
  | { type: 'agents' }
  | { type: 'experts' }
  | { type: 'inspirations' }
  | { type: 'agent'; id: string; share: string }
  | { type: 'expert'; id: string }
  | { type: 'inspiration'; id: string }
  | null;

export function parsePublicRoute(): PublicRoute {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/') {
    const legacy = window.location.hash.replace(/^#/, '');
    const [legacyPath, legacyQuery = ''] = legacy.split('?');
    const legacyAgent = legacyPath.match(/^\/agent\/([^/]+)$/);
    if (legacyAgent) {
      return {
        type: 'agent',
        id: decodeURIComponent(legacyAgent[1]),
        share: new URLSearchParams(legacyQuery).get('share') || ''
      };
    }
    const legacyInspiration = legacyPath.match(/^\/inspiration\/([^/]+)$/);
    if (legacyInspiration) {
      return { type: 'inspiration', id: decodeURIComponent(legacyInspiration[1]) };
    }
    return { type: 'home' };
  }
  if (path === '/agents') return { type: 'agents' };
  if (path === '/experts') return { type: 'experts' };
  if (path === '/inspirations') return { type: 'inspirations' };
  const agent = path.match(/^\/agent\/([^/]+)$/);
  if (agent) {
    return {
      type: 'agent',
      id: decodeURIComponent(agent[1]),
      share: new URLSearchParams(window.location.search).get('share') || ''
    };
  }
  const expert = path.match(/^\/expert\/([^/]+)$/);
  if (expert) return { type: 'expert', id: decodeURIComponent(expert[1]) };
  const inspiration = path.match(/^\/inspiration\/([^/]+)$/);
  if (inspiration) return { type: 'inspiration', id: decodeURIComponent(inspiration[1]) };
  return null;
}

export function setPublicPath(path: string, replace = false) {
  if (typeof window === 'undefined') return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === path && !window.location.hash) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

export function updatePageSeo(input: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  noindex?: boolean;
}) {
  if (typeof document === 'undefined') return;
  const description = input.description || DEFAULT_DESCRIPTION;
  const canonical = `${window.location.origin || SITE_URL}${input.path}`;
  document.title = input.title;
  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[name="robots"]', {
    name: 'robots',
    content: input.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'
  });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: input.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
  if (input.image) {
    upsertMeta('meta[property="og:image"]', {
      property: 'og:image',
      content: input.image.startsWith('http') ? input.image : `${window.location.origin}${input.image}`
    });
  }
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = canonical;
}

export function homeSeo() {
  return {
    title: 'HelloMe-国内交互应用智能体平台创新引领者｜Hello, Me. 懂世界，更懂 Me。',
    description: DEFAULT_DESCRIPTION,
    path: '/'
  };
}

export { SITE_NAME };
