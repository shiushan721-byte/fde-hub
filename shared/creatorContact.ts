/** 演示环境：创作者对外联系手机号（非实名认证隐私号） */
export const DEMO_CREATOR_PHONES: Record<string, string> = {
  'fde-linran': '13100010001',
  'fde-yunfan': '13100010003',
  'fde-maya': '13100010002',
  'fde-zhangheng': '13100010004',
  'fde-chenzimo': '13100010005',
  'fde-emily': '13100010006',
  'fde-zhouchen': '13100010007'
};

export function creatorContactPhone(expert: {
  id?: string;
  socialLinks?: { phone?: string; wechat?: string };
}) {
  const fromLinks = expert.socialLinks?.phone?.trim();
  if (fromLinks) return fromLinks;
  return DEMO_CREATOR_PHONES[expert.id || ''] || '13100010002';
}

export function creatorContactQrValue(expert: {
  id?: string;
  socialLinks?: { phone?: string; wechat?: string };
}) {
  const phone = creatorContactPhone(expert);
  const wechat = expert.socialLinks?.wechat?.trim();
  return wechat ? `https://hellome.art/wechat/${encodeURIComponent(wechat)}` : `tel:${phone}`;
}
