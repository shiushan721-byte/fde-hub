import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';

/** 将演示专家的 domainTags 对齐到平台标签库，便于展示真实关联数量 */
const EXPERT_DOMAIN_TAGS: Record<string, string[]> = {
  'fde-linran': ['电商客服', '知识库构建', '工作流自动化', '私有化部署'],
  'fde-yunfan': ['智能制造', '私有化部署', '知识库检索'],
  'fde-maya': ['营销获客', '内容营销', '电商零售'],
  'fde-zhangheng': ['财报结构化', '智能风控', '法律金融'],
  'fde-chenzimo': ['法律金融', '知识库检索', '办公协同'],
  'fde-emily': ['医疗健康', '知识库检索'],
  'fde-zhouchen': ['办公协同', '工作流自动化']
};

export async function ensureExpertDomainTagsAligned() {
  for (const [expertId, tags] of Object.entries(EXPERT_DOMAIN_TAGS)) {
    const expert = await prisma.expert.findUnique({ where: { id: expertId } });
    if (!expert) continue;
    await prisma.expert.update({
      where: { id: expertId },
      data: { domainTags: toJson(tags) }
    });
  }
}
