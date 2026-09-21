export const AGENT_GALLERY_MAX = 6;
export const AGENT_GALLERY_MAX_BYTES = 10 * 1024 * 1024;
export const AGENT_TITLE_MAX = 20;
export const AGENT_DESC_MAX = 100;

export function normalizeGalleryImages(raw: unknown, coverImage?: string): string[] {
  const urls = Array.isArray(raw)
    ? raw.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const unique = [...new Set(urls)].slice(0, AGENT_GALLERY_MAX);
  if (unique.length) return unique;
  const cover = String(coverImage || '').trim();
  return cover ? [cover] : [];
}
