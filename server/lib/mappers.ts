import type { Agent, Expert } from '@prisma/client';
import { parseJson } from './json';
import { engagementTotals, formatEngagementCount } from './engagement';
import { normalizeAdapterPackages } from '../../shared/adapterPackages';

export function agentToCatalog(agent: Agent) {
  const eng = engagementTotals(agent);
  return {
    id: agent.id,
    title: agent.title,
    desc: agent.desc,
    category: agent.category,
    coverImage: agent.coverImage,
    gradient: agent.gradient,
    tagColor: agent.tagColor,
    badge: agent.badge || undefined,
    canFDECustom: agent.canFDECustom,
    authorName: agent.authorName || undefined,
    authorId: agent.authorId || undefined,
    price: agent.price ?? undefined,
    pricingPlans: parseJson(agent.pricingPlans, undefined),
    likesCount: formatEngagementCount(eng.likesTotal),
    favoritesCount: formatEngagementCount(eng.favoritesTotal),
    commentsCount: agent.commentsCount,
    sharesCount: formatEngagementCount(eng.sharesTotal),
    usageCount: agent.usageCount || undefined,
    rating: agent.rating ?? undefined,
    adapterPackages: normalizeAdapterPackages(parseJson(agent.adapterPackages, []))
  };
}

export function agentToSolution(agent: Agent) {
  const payload = parseJson<Record<string, unknown>>(agent.solutionPayload, {});
  if (payload && payload.id) return payload;
  return {
    id: agent.id,
    title: agent.title,
    subtitle: agent.desc,
    coverImage: agent.coverImage,
    authorId: agent.authorId || '',
    authorName: agent.authorName || '',
    authorAvatar: '',
    authorVerifyType: 'verified_fde',
    authorVerifyLabel: '认证 FDE',
    tags: [agent.category],
    category: agent.category,
    likesCount: engagementTotals(agent).likesTotal,
    usesCount: 0,
    rating: agent.rating || 5,
    description: agent.desc,
    capabilities: [],
    samplePrompts: [],
    systemPromptSnippet: '',
    businessIntegrationTips: '',
    priceFrom: agent.price || 0,
    pricingPlans: parseJson(agent.pricingPlans, undefined),
    demoConversation: []
  };
}

export function expertToPublic(expert: Expert) {
  return {
    id: expert.id,
    expertNo: expert.expertNo || undefined,
    name: expert.name,
    avatar: expert.avatar,
    title: expert.title,
    verifyType: EXPERT_VERIFY_META.verifyType,
    verifyLabel: EXPERT_VERIFY_META.verifyLabel,
    roleTag: expert.roleTag,
    domainTags: parseJson<string[]>(expert.domainTags, []),
    rating: expert.rating,
    ordersCount: expert.ordersCount,
    followersCount: expert.followersCount ?? 0,
    praiseRate: expert.praiseRate,
    responseTime: expert.responseTime,
    bio: expert.bio,
    location: expert.location,
    serviceModes: parseJson<string[]>(expert.serviceModes, []),
    guarantees: parseJson<string[]>(expert.guarantees, []),
    skills: parseJson<string[]>(expert.skills, []),
    stats: parseJson(expert.stats, {}),
    experienceYears: expert.experienceYears,
    featuredQuote: expert.featuredQuote,
    socialLinks: parseJson(expert.socialLinks, {}),
    listed: expert.listed,
    featured: expert.featured,
    paused: expert.paused,
    status: expert.status,
    sortOrder: expert.sortOrder
  };
}

/** 平台仅区分普通用户 / AI 专家，不再分等级 */
export const EXPERT_VERIFY_META = {
  verifyType: 'ai_expert',
  verifyLabel: 'AI 专家'
} as const;
