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
