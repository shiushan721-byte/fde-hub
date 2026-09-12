import { prisma } from '../lib/prisma';
import { toJson, parseJson } from '../lib/json';
import { normalizeCustomProjects } from '../../shared/customProjects';
import { mockHellomeHomeAgents, type HellomeAgentItem } from '../../src/data/mockData';

function catalogPricingPlans(agent: HellomeAgentItem) {
  if (agent.pricingPlans) return agent.pricingPlans;
  if (typeof agent.price === 'number' && agent.price > 0) return { price: agent.price };
  return { isFree: true };
}

function catalogAgentData(agent: HellomeAgentItem, index: number) {
  return {
    id: agent.id,
    kind: 'catalog' as const,
    title: agent.title,
    desc: agent.desc,
    category: agent.category,
    coverImage: agent.coverImage,
    gradient: agent.gradient,
    tagColor: agent.tagColor,
    badge: agent.badge || null,
    canFDECustom: agent.canFDECustom ?? true,
    authorId: agent.authorId,
    authorName: agent.authorName,
    price: agent.price ?? null,
    pricingPlans: toJson(catalogPricingPlans(agent)),
    likesCount: String(agent.likesCount),
    favoritesCount: String(agent.favoritesCount),
    commentsCount: String(agent.commentsCount),
    sharesCount: String(agent.sharesCount ?? '0'),
    usageCount: agent.usageCount,
    rating: agent.rating,
    status: 'published',
    showOnHome: true,
    featured: index < 3,
    sortOrder: index + 1,
    customProjects: toJson(normalizeCustomProjects(agent.customProjects || [])),
    adapterPackages: toJson(agent.adapterPackages || [])
  };
}

/** 把首页演示目录的标价和标准定制项同步进已有库（缺的智能体会补建） */
export async function ensureSampleCustomProjects() {
  for (const [index, agent] of mockHellomeHomeAgents.entries()) {
    const row = await prisma.agent.findUnique({ where: { id: agent.id } });
    const mockProjects = normalizeCustomProjects(agent.customProjects || []);

    if (!row) {
      await prisma.agent.create({ data: catalogAgentData(agent, index) });
      continue;
    }

    if (row.creatorDeletedAt) continue;

    const existing = normalizeCustomProjects(parseJson(row.customProjects, []));
    const byId = new Map(existing.map((item) => [item.id, item]));
    for (const item of mockProjects) {
      byId.set(item.id, item);
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        canFDECustom: agent.canFDECustom ?? row.canFDECustom,
        price: agent.price ?? null,
        pricingPlans: toJson(catalogPricingPlans(agent)),
        customProjects: toJson([...byId.values()]),
        showOnHome: true,
        sortOrder: index + 1
      }
    });
  }
}

export async function ensureAdapterPackagePricing() {
  const agent = await prisma.agent.findUnique({ where: { id: 'hz-canvas' } });
  if (!agent) return;
  const raw = parseJson<Array<Record<string, unknown>>>(agent.adapterPackages, []);
  if (!Array.isArray(raw) || !raw.length) return;
  let changed = false;
  const next = raw.map((row) => {
    if (row.id === 'adp_hz_workbuddy' && row.isFree == null && row.price == null) {
      changed = true;
      return { ...row, isFree: false, price: 29 };
    }
    if (row.isFree == null && row.price == null) {
      changed = true;
      return { ...row, isFree: true, price: 0 };
    }
    return row;
  });
  if (!changed) return;
  await prisma.agent.update({
    where: { id: 'hz-canvas' },
    data: { adapterPackages: toJson(next) }
  });
}
