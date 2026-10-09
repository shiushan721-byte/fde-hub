import { prisma } from '../lib/prisma';
import { parseJson } from '../lib/json';
import { pricingFromAgent } from '../../shared/pricingPlans';
import { describeTrial, type AgentTrialView } from '../../shared/agentTrial';
import { newId } from './certification';
import { getActiveLicense } from './catalogPurchase';

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export async function getAgentTrial(userId: string, agentId: string): Promise<AgentTrialView> {
  const row = await prisma.agentTrial.findUnique({
    where: { userId_agentId: { userId, agentId } }
  });
  if (!row) return describeTrial(null, 0);
  return describeTrial(row.startedAt, row.trialDays);
}

/** 首次成功启动时写入。已有记录不重置；已购买或试用天数 0 时拒绝。 */
export async function startAgentTrial(userId: string, agentId: string): Promise<AgentTrialView> {
  const license = await getActiveLicense(userId, agentId);
  if (license) throw httpError('已购买，无需试用', 409);

  const existing = await prisma.agentTrial.findUnique({
    where: { userId_agentId: { userId, agentId } }
  });
  if (existing) {
    const view = describeTrial(existing.startedAt, existing.trialDays);
    if (view.status === 'expired') throw httpError('试用已结束，请购买后使用', 409);
    return view;
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在', 404);

  const plans = pricingFromAgent({
    price: agent.price,
    pricingPlans: parseJson(agent.pricingPlans, {})
  });
  if (plans.isFree || plans.trialDays < 1) throw httpError('该智能体未开放试用', 400);

  try {
    const row = await prisma.agentTrial.create({
      data: {
        id: newId('trial'),
        userId,
        agentId,
        startedAt: new Date(),
        trialDays: plans.trialDays
      }
    });
    return describeTrial(row.startedAt, row.trialDays);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'P2002') throw error;
    const raced = await prisma.agentTrial.findUnique({
      where: { userId_agentId: { userId, agentId } }
    });
    if (!raced) throw error;
    return describeTrial(raced.startedAt, raced.trialDays);
  }
}
