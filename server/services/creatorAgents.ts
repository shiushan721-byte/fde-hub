import { randomBytes } from 'node:crypto';
import type { Agent } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseEngagementCount } from '../lib/engagement';
import { parseJson, toJson } from '../lib/json';
import {
  catalogPriceYuan,
  normalizePricingPlans,
  pricingFromAgent,
  validatePaidPlans,
  type PricingPlansPayload
} from '../../shared/pricingPlans';
import { normalizeCustomProjects, validateCustomProjects } from '../../shared/customProjects';
import {
  normalizeAdapterPackages,
  validateAdapterPackagePricing
} from '../../shared/adapterPackages';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';

export type CreatorVisibility = 'private' | 'public' | 'draft';

type UpsertAgentInput = {
  id?: string;
  title: string;
  desc: string;
  visibility: CreatorVisibility;
  coverImage?: string;
  version?: string;
  platformSupport?: 'mac' | 'windows' | 'both';
  isFree?: boolean;
  price?: number;
  enableEnterpriseCustomization?: boolean;
  customProjects?: unknown;
  adapterPackages?: unknown;
  skillFileName?: string;
};

function newAgentId() {
  return `agt_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

function dbStatusFromVisibility(visibility: CreatorVisibility): 'draft' | 'offline' | 'in_review' {
  if (visibility === 'public') return 'in_review';
  if (visibility === 'draft') return 'draft';
  return 'offline';
}

function uiStatusFromDb(status: string): 'published' | 'draft' | 'under_review' | 'offline' {
  if (status === 'in_review') return 'under_review';
  if (status === 'published' || status === 'draft' || status === 'offline') return status;
  return 'offline';
}

function mergeSolutionMeta(raw: string, patch: Record<string, unknown>) {
  const current = parseJson<Record<string, unknown>>(raw, {});
  const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
  return toJson({ ...base, ...patch });
}

export function toCreatorAgentItem(agent: Agent) {
  const plans = pricingFromAgent({
    price: agent.price,
    pricingPlans: parseJson(agent.pricingPlans, {})
  });
  const payload = parseJson<Record<string, unknown>>(agent.solutionPayload, {});
  const platformSupport =
    payload.platformSupport === 'mac' ||
    payload.platformSupport === 'windows' ||
    payload.platformSupport === 'both'
      ? payload.platformSupport
      : 'both';
  const version =
    typeof payload.version === 'string' && payload.version.trim()
      ? payload.version.trim()
      : '1.0.0';
  const skillFileName = typeof payload.skillFileName === 'string' ? payload.skillFileName : '';

  return {
    id: agent.id,
    title: agent.title,
    desc: agent.desc,
    category: agent.category,
    coverImage: agent.coverImage,
    pricingType: plans.isFree ? 'free' : 'paid',
    price: plans.price,
    pricingPlans: plans,
    tokenRebateEnabled: true,
    fdeCustomEnabled: agent.canFDECustom,
    customProjects: normalizeCustomProjects(parseJson(agent.customProjects, [])),
    adapterPackages: normalizeAdapterPackages(parseJson(agent.adapterPackages, [])),
    status: uiStatusFromDb(agent.status),
    version,
    platformSupport,
    skillPackage: skillFileName
      ? {
          fileName: skillFileName,
          size: '',
          version,
          hermesCompatibility: '',
          lastValidatedAt: ''
        }
      : undefined,
    viewsCount: 0,
    likesCount: parseEngagementCount(agent.likesCount) + (agent.likesManual || 0),
    favoritesCount: parseEngagementCount(agent.favoritesCount) + (agent.favoritesManual || 0),
    commentsCount: parseEngagementCount(agent.commentsCount),
    paidOrdersCount: 0,
    tokensConsumed: 0,
    totalRevenue: 0,
    createdAt: agent.createdAt.toISOString().slice(0, 10),
    updatedAt: agent.updatedAt.toISOString().slice(0, 10)
  };
}

export async function findExpertForUser(userId: string) {
  return prisma.expert.findFirst({ where: { userId } });
}

export async function listMyAgents(userId: string) {
  const expert = await findExpertForUser(userId);
  if (!expert) return [];
  return prisma.agent.findMany({
    where: { authorId: expert.id, creatorDeletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });
}

/** 立即体验/投喂、定制订单、客户专属实例、咨询线索任一存在即视为已使用 */
export async function agentHasBeenUsed(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { usageCount: true }
  });
  if (parseEngagementCount(agent?.usageCount) > 0) return true;

  const [orders, instances, leads, purchases] = await Promise.all([
    prisma.customOrder.count({ where: { baseAgentId: agentId } }),
    prisma.privateAgentInstance.count({ where: { baseAgentId: agentId } }),
    prisma.consultationLead.count({ where: { agentId } }),
    prisma.agentPurchase.count({ where: { agentId, status: 'paid' } })
  ]);
  return orders > 0 || instances > 0 || leads > 0 || purchases > 0;
}

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

/** 创作者删除：无人使用才可软删。已使用则禁止删除。 */
export async function creatorDeleteAgent(userId: string, agentId: string) {
  const expert = await findExpertForUser(userId);
  if (!expert) {
    throw httpError('仅认证专家可删除自己的智能体', 403);
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, authorId: expert.id }
  });
  if (!agent) {
    throw httpError('智能体不存在或无权删除', 404);
  }
  if (agent.creatorDeletedAt) return agent;

  if (await agentHasBeenUsed(agent.id)) {
    throw httpError('已有用户使用过该智能体，无法删除。可从市场撤回为仅自己可用。', 409);
  }

  return prisma.agent.update({
    where: { id: agent.id },
    data: {
      status: 'offline',
      showOnHome: false,
      creatorDeletedAt: new Date()
    }
  });
}

/** 改价只更新目录现价，不影响已成交定制订单金额 */
export async function creatorUpdatePricing(
  userId: string,
  agentId: string,
  input: PricingPlansPayload
) {
  const expert = await findExpertForUser(userId);
  if (!expert) {
    throw httpError('仅认证专家可调整定价', 403);
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, authorId: expert.id, creatorDeletedAt: null }
  });
  if (!agent) {
    throw httpError('智能体不存在或无权操作', 404);
  }

  const plans = normalizePricingPlans(input);
  const invalid = validatePaidPlans(plans);
  if (invalid) {
    throw httpError(invalid, 400);
  }

  return prisma.agent.update({
    where: { id: agent.id },
    data: {
      price: catalogPriceYuan(plans),
      pricingPlans: toJson(plans)
    }
  });
}

export async function creatorUpdateCustomProjects(
  userId: string,
  agentId: string,
  input: { enabled?: boolean; projects?: unknown }
) {
  const expert = await findExpertForUser(userId);
  if (!expert) {
    throw httpError('仅认证专家可维护定制项目', 403);
  }
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, authorId: expert.id, creatorDeletedAt: null }
  });
  if (!agent) {
    throw httpError('智能体不存在或无权操作', 404);
  }

  const projects = normalizeCustomProjects(input.projects);
  const invalid = validateCustomProjects(projects);
  if (invalid) throw httpError(invalid, 400);

  return prisma.agent.update({
    where: { id: agent.id },
    data: {
      canFDECustom: input.enabled ?? agent.canFDECustom,
      customProjects: toJson(projects)
    }
  });
}

function nextStatusForVisibility(currentStatus: string, visibility: CreatorVisibility): string {
  if (visibility === 'draft') return currentStatus === 'published' ? 'offline' : 'draft';
  if (visibility === 'private') return 'offline';
  // public: never skip review. Already listed stays listed until they unpublish.
  if (currentStatus === 'published') return 'published';
  return 'in_review';
}

export async function creatorUpsertAgent(userId: string, input: UpsertAgentInput) {
  const expert = await findExpertForUser(userId);
  if (!expert) {
    throw httpError('仅认证专家可发布智能体', 403);
  }

  const title = input.title.trim();
  const desc = input.desc.trim();
  if (!title) throw httpError('请填写智能体名称', 400);
  if (!desc) throw httpError('请填写功能描述', 400);

  const plans = normalizePricingPlans({
    isFree: Boolean(input.isFree),
    price: input.price
  });
  if (input.visibility !== 'draft') {
    const invalidPlans = validatePaidPlans(plans);
    if (invalidPlans) throw httpError(invalidPlans, 400);
  }

  const projects = normalizeCustomProjects(input.customProjects);
  const invalidProjects = validateCustomProjects(projects);
  if (invalidProjects) throw httpError(invalidProjects, 400);

  const packages = normalizeAdapterPackages(input.adapterPackages || []);
  for (const pack of packages) {
    const invalid = validateAdapterPackagePricing(pack);
    if (invalid) throw httpError(invalid, 400);
  }

  const existing = input.id
    ? await prisma.agent.findFirst({
        where: { id: input.id, authorId: expert.id, creatorDeletedAt: null }
      })
    : null;
  if (input.id && !existing) {
    throw httpError('智能体不存在或无权操作', 404);
  }

  const status = existing
    ? nextStatusForVisibility(existing.status, input.visibility)
    : dbStatusFromVisibility(input.visibility);
  const showOnHome = status === 'published' ? existing?.showOnHome ?? false : false;

  const metaPatch: Record<string, unknown> = {};
  if (input.platformSupport) metaPatch.platformSupport = input.platformSupport;
  if (input.version) metaPatch.version = input.version;
  if (input.skillFileName) metaPatch.skillFileName = input.skillFileName;

  const data = {
    title,
    desc,
    coverImage: input.coverImage?.trim() || existing?.coverImage || DEFAULT_COVER,
    price: catalogPriceYuan(plans),
    pricingPlans: toJson(plans),
    canFDECustom: input.enableEnterpriseCustomization ?? existing?.canFDECustom ?? true,
    customProjects: toJson(projects),
    adapterPackages:
      input.adapterPackages !== undefined
        ? toJson(packages)
        : existing?.adapterPackages || '[]',
    status,
    showOnHome,
    authorId: expert.id,
    authorName: expert.name,
    solutionPayload: mergeSolutionMeta(existing?.solutionPayload || '', metaPatch)
  };

  const agent = existing
    ? await prisma.agent.update({ where: { id: existing.id }, data })
    : await prisma.agent.create({
        data: {
          id: newAgentId(),
          kind: 'catalog',
          category: '未分类',
          gradient: '',
          tagColor: '',
          ...data
        }
      });

  return toCreatorAgentItem(agent);
}

export async function creatorUnpublishAgent(userId: string, agentId: string) {
  const expert = await findExpertForUser(userId);
  if (!expert) throw httpError('仅认证专家可操作自己的智能体', 403);
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, authorId: expert.id, creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在或无权操作', 404);
  if (agent.status === 'offline' || agent.status === 'draft') {
    return toCreatorAgentItem(agent);
  }
  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'offline', showOnHome: false }
  });
  return toCreatorAgentItem(updated);
}

export async function creatorSubmitPublic(userId: string, agentId: string) {
  const expert = await findExpertForUser(userId);
  if (!expert) throw httpError('仅认证专家可申请公开上架', 403);
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, authorId: expert.id, creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在或无权操作', 404);
  if (agent.status === 'published') return toCreatorAgentItem(agent);
  if (agent.status === 'in_review') return toCreatorAgentItem(agent);
  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'in_review', showOnHome: false }
  });
  return toCreatorAgentItem(updated);
}

