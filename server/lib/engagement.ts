/** 解析 "2.4k" / "1,203" / "88" 等计数文案为整数 */
export function parseEngagementCount(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  if (!raw) return 0;
  const s = String(raw).trim().toLowerCase().replace(/,/g, '');
  if (!s) return 0;
  if (s.endsWith('k')) {
    const n = parseFloat(s.slice(0, -1));
    return Number.isFinite(n) ? Math.max(0, Math.round(n * 1000)) : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export function formatEngagementCount(total: number): string {
  if (total >= 10000) return `${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}k`.replace(/\.0k$/, 'k');
  if (total >= 1000) {
    const k = total / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(total);
}

export function engagementTotals(agent: {
  likesCount?: string | number | null;
  favoritesCount?: string | number | null;
  sharesCount?: string | number | null;
  likesManual?: number | null;
  favoritesManual?: number | null;
  sharesManual?: number | null;
}) {
  const likesActual = parseEngagementCount(agent.likesCount);
  const favoritesActual = parseEngagementCount(agent.favoritesCount);
  const sharesActual = parseEngagementCount(agent.sharesCount);
  const likesManual = Math.max(0, Math.round(agent.likesManual || 0));
  const favoritesManual = Math.max(0, Math.round(agent.favoritesManual || 0));
  const sharesManual = Math.max(0, Math.round(agent.sharesManual || 0));
  return {
    likesActual,
    favoritesActual,
    sharesActual,
    likesManual,
    favoritesManual,
    sharesManual,
    likesTotal: likesActual + likesManual,
    favoritesTotal: favoritesActual + favoritesManual,
    sharesTotal: sharesActual + sharesManual
  };
}
