export type AgentCustomProject = {
  id: string;
  title: string;
  description: string;
  /** 元 */
  price: number;
  active: boolean;
  sortOrder: number;
};

function toNonNegInt(raw: unknown, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export function newCustomProjectId() {
  return `cprj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
      return {
        id: String(row.id || newCustomProjectId()),
        title,
        description: String(row.description || row.desc || '').trim(),
        price,
        active: row.active !== false,
        sortOrder: toNonNegInt(row.sortOrder, index)
      };
    })
    .filter((item): item is AgentCustomProject => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN'));
}

export function activeCustomProjects(raw: unknown): AgentCustomProject[] {
  return normalizeCustomProjects(raw).filter((item) => item.active && item.price >= 0);
}

export function validateCustomProjects(projects: AgentCustomProject[]): string | null {
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
