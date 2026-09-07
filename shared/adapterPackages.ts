export type AgentAdapterPackage = {
  id: string;
  platformName: string;
  fileName: string;
  size: string;
  url: string;
  fileKey?: string;
  /** 缺省为免费，兼容旧数据 */
  isFree?: boolean;
  /** 元；收费时须 > 0 */
  price?: number;
};

function toNonNegInt(raw: unknown, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export function adapterPackageIsFree(pack: Pick<AgentAdapterPackage, 'isFree' | 'price'>) {
  if (pack.isFree === false) return false;
  if (typeof pack.price === 'number' && pack.price > 0) return false;
  return true;
}

export function adapterPackagePriceYuan(pack: Pick<AgentAdapterPackage, 'isFree' | 'price'>) {
  if (adapterPackageIsFree(pack)) return 0;
  return Math.max(0, toNonNegInt(pack.price));
}

export function validateAdapterPackagePricing(pack: Pick<AgentAdapterPackage, 'platformName' | 'isFree' | 'price'>) {
  if (adapterPackageIsFree(pack)) return null;
  if (adapterPackagePriceYuan(pack) < 1) {
    return `「${pack.platformName || '适配包'}」收费时售价须大于 0`;
  }
  return null;
}

export function normalizeAdapterPackages(raw: unknown): AgentAdapterPackage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const platformName = String(row.platformName || '').trim();
      const url = String(row.url || '').trim();
      if (!platformName || !url) return null;
      const price = toNonNegInt(row.price ?? (Number(row.priceCents) > 0 ? Number(row.priceCents) / 100 : 0));
      const isFree = row.isFree === false ? false : row.isFree === true ? true : !(price > 0);
      return {
        id: String(row.id || `adp_${Math.random().toString(36).slice(2, 10)}`),
        platformName,
        fileName: String(row.fileName || `${platformName}.zip`),
        size: String(row.size || ''),
        url,
        fileKey: row.fileKey ? String(row.fileKey) : undefined,
        isFree,
        price: isFree ? 0 : price
      };
    })
    .filter(Boolean) as AgentAdapterPackage[];
}

/** 前台公开列表：收费包不返回真实下载地址 */
export function adapterPackagesForPublic(raw: unknown): AgentAdapterPackage[] {
  return normalizeAdapterPackages(raw).map((pack) => {
    if (adapterPackageIsFree(pack)) return pack;
    return { ...pack, url: '', fileKey: undefined };
  });
}

export function adapterPackagesForOwner(raw: unknown): AgentAdapterPackage[] {
  return normalizeAdapterPackages(raw);
}

export function findAdapterPackage(raw: unknown, packageId: string) {
  return normalizeAdapterPackages(raw).find((pack) => pack.id === packageId) || null;
}

export function adapterDisplayName(platformName: string) {
  const name = platformName.trim();
  return /版$/.test(name) ? name : `${name} 版`;
}

export function adapterZipAbsoluteUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === 'undefined') return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** 发给外部 AI（如 WorkBuddy）用于安装该适配 ZIP 里的 skills */
export function buildAdapterSkillPrompt(input: {
  agentTitle: string;
  agentDesc?: string;
  platformName: string;
  zipUrl: string;
}) {
  const zipUrl = adapterZipAbsoluteUrl(input.zipUrl);
  const desc = (input.agentDesc || '').replace(/\s+/g, ' ').trim();
  return [
    `请帮我安装 Hellome 智能体「${input.agentTitle}」对应的 skills。`,
    desc ? `能力说明：${desc}` : '',
    `适配平台：${adapterDisplayName(input.platformName)}`,
    zipUrl ? `安装包：${zipUrl}` : '',
    '请根据该提示词完成 skill 安装后使用。'
  ]
    .filter(Boolean)
    .join('\n');
}
