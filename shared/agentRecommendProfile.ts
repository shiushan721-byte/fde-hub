const TAG_RULES: Array<{ tag: string; cues: string[] }> = [
  { tag: '图片压缩', cues: ['压缩', '瘦身', '体积'] },
  { tag: '图片瘦身', cues: ['压缩', '瘦身', '体积'] },
  { tag: 'JPG/PNG 处理', cues: ['jpg', 'png', '图片', '图像'] },
  { tag: '商品图优化', cues: ['商品图', '商品', '电商', '主图'] },
  { tag: '无限画布', cues: ['画布', 'canvas'] },
  { tag: '素材标注', cues: ['标注', '素材'] },
  { tag: 'AI 视频生成', cues: ['视频', '成片', '分镜'] },
  { tag: 'GEO 内容', cues: ['geo', '可见度', 'ai搜索'] },
  { tag: '公文起草', cues: ['公文', '请示', '文书', '通知'] },
  { tag: '会议纪要', cues: ['纪要', '会议', '待办'] },
  { tag: '合同审查', cues: ['合同', '条款', '法务', '合规'] },
  { tag: '客服售后', cues: ['客服', '售后', '工单', '退换'] },
  { tag: '简历优化', cues: ['简历', '求职', '面试'] },
  { tag: '短视频脚本', cues: ['脚本', '短视频', '口播'] },
  { tag: 'PDF 处理', cues: ['pdf', '合并', '提取'] },
  { tag: '离线知识库', cues: ['离线', '知识库', '排障', '手册'] }
];

function compactDoes(text: string, max = 100) {
  const value = text.replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function inferRecommendDoes(title: string, desc: string) {
  const source = desc.trim() || title.trim();
  return compactDoes(source, 100);
}

export function inferRecommendTags(title: string, desc: string, category?: string) {
  const hay = `${title} ${desc} ${category || ''}`.toLowerCase();
  const tags: string[] = [];
  for (const rule of TAG_RULES) {
    if (rule.cues.some((cue) => hay.includes(cue.toLowerCase()))) {
      tags.push(rule.tag);
    }
    if (tags.length >= 5) break;
  }
  if (category && !tags.includes(category) && tags.length < 5) tags.push(category);
  if (tags.length === 0 && title.trim()) tags.push(title.trim().slice(0, 12));
  return tags.slice(0, 5);
}

export function normalizeRecommendTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of raw) {
    const tag = String(item || '').trim().slice(0, 16);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 8) break;
  }
  return tags;
}
