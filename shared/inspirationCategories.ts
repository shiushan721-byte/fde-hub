export const INSPIRATION_CATEGORY_LABELS = ['视频', '图片', '网页', '其他'] as const;

export type InspirationCategory = (typeof INSPIRATION_CATEGORY_LABELS)[number];

export const INSPIRATION_HOME_CATEGORIES = ['全部', ...INSPIRATION_CATEGORY_LABELS];

export function isInspirationCategory(value: unknown): value is InspirationCategory {
  return typeof value === 'string' && (INSPIRATION_CATEGORY_LABELS as readonly string[]).includes(value);
}

export function inspirationCategoryLabel(value?: string | null) {
  return isInspirationCategory(value) ? value : '';
}

export function guessInspirationCategory(item: { imageUrl?: string; fileName?: string }): InspirationCategory {
  const name = `${item.fileName || ''} ${item.imageUrl || ''}`.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)(\b|$)/i.test(name) || /video|storyboard|成片|短视频/.test(name)) {
    return '视频';
  }
  if (/\.(html?|pdf)(\b|$)/i.test(name) || /article|brief|weekly|网页/.test(name)) {
    return '网页';
  }
  if (/\.(png|jpe?g|gif|webp|svg)(\b|$)/i.test(name)) return '图片';
  return '其他';
}
