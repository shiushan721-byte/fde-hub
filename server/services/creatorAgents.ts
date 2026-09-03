import { prisma } from '../lib/prisma';
import { parseEngagementCount } from '../lib/engagement';
import { toJson } from '../lib/json';
import {
  catalogPriceYuan,
  normalizePricingPlans,
  validatePaidPlans,
  type PricingPlansPayload
} from '../../shared/pricingPlans';

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
