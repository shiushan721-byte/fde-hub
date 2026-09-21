import { MAX_STANDARD_SERVICES, RETIRED_OFFICIAL_PRODUCT_IDS } from './officialProductCatalog';

export type OfficialProductTemplate = {
  id: string;
  title: string;
  description: string;
  /** 建议售价（元），仅供创作者参考，不构成成交价 */
  suggestedPrice: number;
  sortOrder: number;
};

export type ProductAttachment = {
  id: string;
  fileName: string;
  size: string;
  url: string;
  fileKey?: string;
};

export type AgentCustomProject = {
  id: string;
  title: string;
  description: string;
  /** 元，创作者实际售价 */
  price: number;
  active: boolean;
  sortOrder: number;
  source: 'official' | 'custom';
  officialProductId?: string;
  suggestedPrice?: number;
  createdAt?: string;
  attachments?: ProductAttachment[];
};

export function newProductAttachmentId() {
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toNonNegInt(raw: unknown, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export function newCustomProjectId() {
  return `cprj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 从自定义商品 id 或显式时间戳还原创建时间（毫秒）。无法识别时返回 0。 */
export function customProjectCreatedAtMs(id: string, explicit?: string) {
  if (explicit) {
    const t = Date.parse(explicit);
    if (Number.isFinite(t)) return t;
  }
  const parts = id.split('_');
  if (parts[0] === 'cprj' && parts.length >= 3) {
    const ts = parseInt(parts[1], 36);
    if (Number.isFinite(ts) && ts > 1_600_000_000_000 && ts < 4_000_000_000_000) return ts;
  }
  return 0;
}

export function normalizeCustomProjects(raw: unknown): AgentCustomProject[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = String(row.title || '').trim();
      if (!title) return null;
      const price = toNonNegInt(row.price ?? (Number(row.priceCents) > 0 ? Number(row.priceCents) / 100 : 0));
      const officialProductId = String(row.officialProductId || '').trim();
      const source = officialProductId || row.source === 'official' ? 'official' : 'custom';
      const suggestedPrice = toNonNegInt(row.suggestedPrice ?? row.suggested_price, 0);
      const id = String(row.id || newCustomProjectId());
      const createdMs = customProjectCreatedAtMs(id, String(row.createdAt || ''));
      const attachments = normalizeProductAttachments(row.attachments);
      return {
        id,
        title,
        description: String(row.description || row.desc || '').trim(),
        price,
        active: row.active !== false,
        sortOrder: toNonNegInt(row.sortOrder, index),
        source,
        ...(officialProductId ? { officialProductId } : {}),
        ...(suggestedPrice > 0 ? { suggestedPrice } : {}),
        ...(createdMs > 0 ? { createdAt: new Date(createdMs).toISOString() } : {}),
        ...(attachments.length ? { attachments } : {})
      };
    })
    .filter((item): item is AgentCustomProject => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN'));
}

export function activeCustomProjects(raw: unknown): AgentCustomProject[] {
  return normalizeCustomProjects(raw).filter((item) => item.active && item.price >= 0);
}

export function validateCustomProjects(
  projects: AgentCustomProject[],
  options?: { previousCount?: number }
): string | null {
  if (projects.length > MAX_STANDARD_SERVICES && projects.length > (options?.previousCount ?? 0)) {
    return `标准服务最多 ${MAX_STANDARD_SERVICES} 项`;
  }
  for (const item of projects) {
    if (!item.title.trim()) return '请填写定制项目名称';
    if (item.price < 1) return `「${item.title}」售价须大于 0`;
  }
  return null;
}

export function customProjectsTotalYuan(projects: AgentCustomProject[]) {
  return projects.reduce((sum, item) => sum + Math.max(0, item.price), 0);
}

export function snapshotCustomProjects(projects: AgentCustomProject[]) {
  return projects.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price,
    priceCents: item.price * 100
  }));
}

export function normalizeProductAttachments(raw: unknown): ProductAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const url = String(row.url || '').trim();
      const fileName = String(row.fileName || row.name || '').trim();
      if (!url || !fileName) return null;
      return {
        id: String(row.id || newProductAttachmentId()),
        fileName,
        size: String(row.size || ''),
        url,
        fileKey: row.fileKey ? String(row.fileKey) : undefined
      };
    })
    .filter((item): item is ProductAttachment => Boolean(item));
}

export function isOfficialProject(item: AgentCustomProject) {
  return item.source === 'official' || Boolean(item.officialProductId);
}

export function mergeOfficialProducts(
  existing: AgentCustomProject[],
  official: OfficialProductTemplate[],
  omittedIds: string[] = []
): AgentCustomProject[] {
  const omitted = new Set(omittedIds.filter(Boolean));
  const current = normalizeCustomProjects(existing).filter(
    (item) => !item.officialProductId || !RETIRED_OFFICIAL_PRODUCT_IDS.includes(item.officialProductId)
  );
  const used = new Set(
    current
      .map((item) => item.officialProductId)
      .filter((id): id is string => Boolean(id))
  );

  const room = Math.max(0, MAX_STANDARD_SERVICES - current.length);
  const injected: AgentCustomProject[] = official
    .filter((item) => !omitted.has(item.id) && !used.has(item.id))
    .slice(0, room)
    .map((item, index) => ({
      id: newCustomProjectId(),
      title: item.title,
      description: item.description,
      price: Math.max(1, item.suggestedPrice),
      active: true,
      sortOrder: -1000 + (item.sortOrder || index),
      source: 'official' as const,
      officialProductId: item.id,
      suggestedPrice: item.suggestedPrice
    }));

  const withHints = current.map((item) => {
    if (!item.officialProductId) return item;
    const tmpl = official.find((row) => row.id === item.officialProductId);
    if (!tmpl) return item;
    return {
      ...item,
      title: tmpl.title,
      description: tmpl.description,
      source: 'official' as const,
      suggestedPrice: tmpl.suggestedPrice
    };
  });

  return [...injected, ...withHints].map((item, index) => ({ ...item, sortOrder: index }));
}
