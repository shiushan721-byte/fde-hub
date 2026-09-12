import { prisma } from '../lib/prisma';
import { parseEngagementCount } from '../lib/engagement';
import { notifyUser, resolveExpertUserId } from './notifications';

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function newEngagementId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function bumpCount(raw: string | number | null | undefined, delta: number) {
  return String(Math.max(0, parseEngagementCount(raw) + delta));
}

export async function listMyEngagement(userId: string) {
  const [likes, favorites, follows] = await Promise.all([
    prisma.agentLike.findMany({ where: { userId }, select: { agentId: true } }),
    prisma.agentFavorite.findMany({ where: { userId }, select: { agentId: true } }),
    prisma.expertFollow.findMany({ where: { userId }, select: { expertId: true } })
  ]);
  return {
    likedAgentIds: likes.map((row) => row.agentId),
    favoriteAgentIds: favorites.map((row) => row.agentId),
    followedExpertIds: follows.map((row) => row.expertId)
  };
}

async function publishedAgent(agentId: string) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, status: 'published', creatorDeletedAt: null },
    select: { id: true, title: true, authorId: true, likesCount: true, favoritesCount: true }
  });
  if (!agent) throw httpError('智能体不存在或未上架', 404);
  return agent;
}

export async function toggleAgentLike(input: { agentId: string; userId: string; userName?: string }) {
  const agent = await publishedAgent(input.agentId);
  const existing = await prisma.agentLike.findUnique({
    where: { agentId_userId: { agentId: agent.id, userId: input.userId } }
  });

  if (existing) {
    await prisma.$transaction([
      prisma.agentLike.delete({ where: { id: existing.id } }),
      prisma.agent.update({
        where: { id: agent.id },
        data: { likesCount: bumpCount(agent.likesCount, -1) }
      })
    ]);
    return { liked: false, likesCount: Math.max(0, parseEngagementCount(agent.likesCount) - 1) };
  }

  const nextCount = parseEngagementCount(agent.likesCount) + 1;
  await prisma.$transaction([
    prisma.agentLike.create({
      data: {
        id: newEngagementId('alk'),
        agentId: agent.id,
        userId: input.userId
      }
    }),
    prisma.agent.update({
      where: { id: agent.id },
      data: { likesCount: String(nextCount) }
    })
  ]);

  const authorUserId = await resolveExpertUserId(agent.authorId);
  if (authorUserId && authorUserId !== input.userId) {
    const likerName = (input.userName || '有人').trim() || '有人';
    await notifyUser({
      userId: authorUserId,
      type: 'agent_like',
      title: `有人赞了你的智能体「${agent.title}」`,
      body: `${likerName} 点赞了你的智能体。`,
      link: `/agent/${agent.id}`,
      payload: { agentId: agent.id, agentTitle: agent.title, likerUserId: input.userId }
    });
  }

  return { liked: true, likesCount: nextCount };
}

export async function toggleAgentFavorite(input: {
  agentId: string;
  userId: string;
  userName?: string;
}) {
  const agent = await publishedAgent(input.agentId);
  const existing = await prisma.agentFavorite.findUnique({
    where: { agentId_userId: { agentId: agent.id, userId: input.userId } }
  });

  if (existing) {
    await prisma.$transaction([
      prisma.agentFavorite.delete({ where: { id: existing.id } }),
      prisma.agent.update({
        where: { id: agent.id },
        data: { favoritesCount: bumpCount(agent.favoritesCount, -1) }
      })
    ]);
    return {
      favorited: false,
      favoritesCount: Math.max(0, parseEngagementCount(agent.favoritesCount) - 1)
    };
  }

  const nextCount = parseEngagementCount(agent.favoritesCount) + 1;
  await prisma.$transaction([
    prisma.agentFavorite.create({
      data: {
        id: newEngagementId('afv'),
        agentId: agent.id,
        userId: input.userId
      }
    }),
    prisma.agent.update({
      where: { id: agent.id },
      data: { favoritesCount: String(nextCount) }
    })
  ]);

  const authorUserId = await resolveExpertUserId(agent.authorId);
  if (authorUserId && authorUserId !== input.userId) {
    const name = (input.userName || '有人').trim() || '有人';
    await notifyUser({
      userId: authorUserId,
      type: 'agent_favorite',
      title: `有人收藏了你的智能体「${agent.title}」`,
      body: `${name} 收藏了你的智能体。`,
      link: `/agent/${agent.id}`,
      payload: { agentId: agent.id, agentTitle: agent.title, favoriteUserId: input.userId }
    });
  }

  return { favorited: true, favoritesCount: nextCount };
}

export async function toggleExpertFollow(input: {
  expertId: string;
  userId: string;
  userName?: string;
}) {
  const expert = await prisma.expert.findFirst({
    where: { id: input.expertId, listed: true, status: 'active' },
    select: { id: true, name: true, userId: true, followersCount: true }
  });
  if (!expert) throw httpError('专家不存在或未公开', 404);
  if (expert.userId && expert.userId === input.userId) {
    throw httpError('不能关注自己', 400);
  }

  const existing = await prisma.expertFollow.findUnique({
    where: { expertId_userId: { expertId: expert.id, userId: input.userId } }
  });

  if (existing) {
    await prisma.$transaction([
      prisma.expertFollow.delete({ where: { id: existing.id } }),
      prisma.expert.update({
        where: { id: expert.id },
        data: { followersCount: Math.max(0, expert.followersCount - 1) }
      })
    ]);
    return { followed: false, followersCount: Math.max(0, expert.followersCount - 1) };
  }

  const nextCount = expert.followersCount + 1;
  await prisma.$transaction([
    prisma.expertFollow.create({
      data: {
        id: newEngagementId('efw'),
        expertId: expert.id,
        userId: input.userId
      }
    }),
    prisma.expert.update({
      where: { id: expert.id },
      data: { followersCount: nextCount }
    })
  ]);

  if (expert.userId) {
    const name = (input.userName || '有人').trim() || '有人';
    await notifyUser({
      userId: expert.userId,
      type: 'expert_follow',
      title: '新粉丝关注了你',
      body: `用户 ${name} 关注了你的专家主页。`,
      link: `/expert/${expert.id}`,
      payload: { expertId: expert.id, followerUserId: input.userId }
    });
  }

  return { followed: true, followersCount: nextCount };
}
