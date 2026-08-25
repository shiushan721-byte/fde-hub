import type { FDEExpert } from '../types';

/** 前台专家展示：推荐优先，同档按已上架智能体数量降序 */
export function sortExpertsForPublic(experts: FDEExpert[]): FDEExpert[] {
  return [...experts].sort((a, b) => {
    const featuredA = a.featured ? 1 : 0;
    const featuredB = b.featured ? 1 : 0;
    if (featuredA !== featuredB) return featuredB - featuredA;
    const countA = a.stats?.publishedAgentsCount ?? 0;
    const countB = b.stats?.publishedAgentsCount ?? 0;
    return countB - countA;
  });
}
