export type AgentAdapterPackage = {
  id: string;
  platformName: string;
  fileName: string;
  size: string;
  url: string;
  fileKey?: string;
};

export function normalizeAdapterPackages(raw: unknown): AgentAdapterPackage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const platformName = String(row.platformName || '').trim();
      const url = String(row.url || '').trim();
      if (!platformName || !url) return null;
      return {
        id: String(row.id || `adp_${Math.random().toString(36).slice(2, 10)}`),
        platformName,
        fileName: String(row.fileName || `${platformName}.zip`),
        size: String(row.size || ''),
        url,
        fileKey: row.fileKey ? String(row.fileKey) : undefined
      };
    })
    .filter((item): item is AgentAdapterPackage => Boolean(item));
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
