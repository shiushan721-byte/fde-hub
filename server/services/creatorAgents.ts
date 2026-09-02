import { prisma } from '../lib/prisma';

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

/** 创作者软删：已上架则立即下架，记录仍保留给后台。 */
export async function creatorDeleteAgent(userId: string, agentId: string) {
  const expert = await findExpertForUser(userId);
  if (!expert) {
    const err = new Error('仅认证专家可删除自己的智能体');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, authorId: expert.id }
  });
  if (!agent) {
    const err = new Error('智能体不存在或无权删除');
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (agent.creatorDeletedAt) return agent;

  return prisma.agent.update({
    where: { id: agent.id },
    data: {
      status: 'offline',
      showOnHome: false,
      creatorDeletedAt: new Date()
    }
  });
}
