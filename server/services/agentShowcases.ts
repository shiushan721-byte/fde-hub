import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';
import { findExpertForUser } from './creatorAgents';
import { isInspirationCategory } from '../../shared/inspirationCategories';
import { notifyUser } from './notifications';

const TITLE_MAX = 40;
const PER_USER_LIMIT = 20;

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function newShowcaseId() {
  return `ash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newLikeId() {
  return `asl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function mapShowcase(row: {
  id: string;
  agentId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description?: string;
  imageUrl: string;
  fileName: string;
  status: string;
  featured: boolean;
  inspireCategory?: string;
  likesCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}) {
  return {
    id: row.id,
    agentId: row.agentId,
    userId: row.userId,
    userName: row.userName,
    userAvatar: row.userAvatar,
    title: row.title,
    description: row.description || '',
    imageUrl: row.imageUrl,
    fileName: row.fileName,
    status: row.status,
    featured: row.featured,
    inspireCategory: row.inspireCategory || '',
    hidden: row.status === 'hidden',
    likesCount: row.likesCount || 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.updatedAt || row.createdAt).toISOString()
  };
}

export async function isAgentAuthor(userId: string | undefined, agentAuthorId: string | null) {
  if (!userId || !agentAuthorId) return false;
  if (userId === agentAuthorId || userId === `user-${agentAuthorId}`) return true;
  const expert = await findExpertForUser(userId);
  if (expert && expert.id === agentAuthorId) return true;
  const authorExpert = await prisma.expert.findUnique({
    where: { id: agentAuthorId },
    select: { userId: true }
  });
  return Boolean(authorExpert?.userId && authorExpert.userId === userId);
}

export async function listAgentShowcases(input: {
  agentId: string;
  viewerUserId?: string;
  isAuthor: boolean;
}) {
  const rows = await prisma.agentShowcase.findMany({
    where: input.isAuthor
      ? { agentId: input.agentId }
      : {
          agentId: input.agentId,
          OR: [
            { status: 'visible' },
            ...(input.viewerUserId ? [{ userId: input.viewerUserId }] : [])
          ]
        },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }]
  });
  return rows.map(mapShowcase);
}

export async function listAllAgentShowcases(agentId: string) {
  const rows = await prisma.agentShowcase.findMany({
    where: { agentId },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }]
  });
  return rows.map(mapShowcase);
}

export async function createAgentShowcase(input: {
  agentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title?: string;
  description?: string;
  imageUrl: string;
  fileName?: string;
}) {
  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在', 404);

  const title = (input.title || '').trim().slice(0, TITLE_MAX);
  const description = (input.description || '').trim().slice(0, 800);
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) throw httpError('请上传成果图片');
  if (!title) throw httpError('请填写成果标题');
  if (!description) throw httpError('请填写成果介绍');
  if (!/^(\/uploads\/|https?:\/\/|data:image\/)/i.test(imageUrl)) {
    throw httpError('图片地址无效');
  }

  const existing = await prisma.agentShowcase.count({
    where: { agentId: agent.id, userId: input.userId }
  });
  if (existing >= PER_USER_LIMIT) {
    throw httpError(`每位用户最多上传 ${PER_USER_LIMIT} 条成果`);
  }

  const row = await prisma.agentShowcase.create({
    data: {
      id: newShowcaseId(),
      agentId: agent.id,
      userId: input.userId,
      userName: input.userName.trim() || '用户',
      userAvatar: input.userAvatar || '',
      title,
      description,
      imageUrl,
      fileName: (input.fileName || '').slice(0, 120),
      status: 'visible',
      featured: false
    }
  });
  return mapShowcase(row);
}

export async function moderateAgentShowcase(input: {
  agentId: string;
  showcaseId: string;
  actorUserId: string;
  featured?: boolean;
  hidden?: boolean;
  inspireCategory?: string;
  asAdmin?: boolean;
}) {
  const agent = await prisma.agent.findUnique({
    where: { id: input.agentId },
    select: { id: true, title: true, authorId: true }
  });
  if (!agent) throw httpError('智能体不存在', 404);
  if (!input.asAdmin && !(await isAgentAuthor(input.actorUserId, agent.authorId))) {
    throw httpError('仅作者可精选成果', 403);
  }

  const row = await prisma.agentShowcase.findFirst({
    where: { id: input.showcaseId, agentId: agent.id }
  });
  if (!row) throw httpError('成果不存在', 404);

  const data: { featured?: boolean; status?: string; inspireCategory?: string } = {};
  if (input.hidden === true) {
    data.status = 'hidden';
    data.featured = false;
  } else if (input.hidden === false) {
    data.status = 'visible';
  }
  if (input.featured === true) {
    const category = input.inspireCategory || row.inspireCategory;
    if (input.asAdmin && !isInspirationCategory(category)) {
      throw httpError('请选择推荐分类：视频、图片、网页或其他', 400);
    }
    data.featured = true;
    data.status = 'visible';
    if (isInspirationCategory(category)) data.inspireCategory = category;
  } else if (input.featured === false) {
    data.featured = false;
  }
  if (input.inspireCategory && isInspirationCategory(input.inspireCategory) && input.featured !== false) {
    data.inspireCategory = input.inspireCategory;
  }

  if (Object.keys(data).length === 0) throw httpError('没有可更新的字段');

  const updated = await prisma.agentShowcase.update({
    where: { id: row.id },
    data
  });

  if (data.featured === true && !row.featured && updated.userId && updated.userId !== input.actorUserId) {
    const actor = await prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { name: true }
    });
    const actorName = actor?.name || (input.asAdmin ? '平台运营' : '作者');
    await notifyUser({
      userId: updated.userId,
      type: 'showcase_featured',
      title: `你的成果「${updated.title || '未命名成果'}」被设为精选`,
      body: `${actorName} 将你在「${agent.title}」上传的成果设为精选。`,
      link: `/inspiration/${updated.id}`,
      payload: {
        showcaseId: updated.id,
        agentId: agent.id,
        agentTitle: agent.title,
        actorUserId: input.actorUserId
      }
    });
  }

  return mapShowcase(updated);
}

export async function deleteAgentShowcase(input: {
  agentId: string;
  showcaseId: string;
  actorUserId: string;
}) {
  const agent = await prisma.agent.findUnique({
    where: { id: input.agentId },
    select: { id: true, authorId: true }
  });
  if (!agent) throw httpError('智能体不存在', 404);

  const row = await prisma.agentShowcase.findFirst({
    where: { id: input.showcaseId, agentId: agent.id }
  });
  if (!row) throw httpError('成果不存在', 404);

  const author = await isAgentAuthor(input.actorUserId, agent.authorId);
  if (!author && row.userId !== input.actorUserId) {
    throw httpError('无权删除该成果', 403);
  }

  await prisma.agentShowcase.delete({ where: { id: row.id } });
  return { deleted: true };
}

function mapInspiration(
  row: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    fileName: string;
    likesCount: number;
    featured: boolean;
    inspireCategory?: string;
    createdAt: Date;
    updatedAt: Date;
    userName: string;
    userAvatar: string;
    userId: string;
    agent: {
      id: string;
      title: string;
      desc: string;
      coverImage: string;
      category: string;
      authorId: string | null;
      authorName: string | null;
    };
  },
  authorExpert: { id: string; name: string; avatar: string; title: string } | null,
  liked = false
) {
  return {
    id: row.id,
    title: row.title || '未命名成果',
    description: row.description || '',
    imageUrl: row.imageUrl,
    fileName: row.fileName,
    likesCount: row.likesCount || 0,
    liked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    featured: row.featured,
    inspireCategory: row.inspireCategory || '',
    user: {
      id: row.userId,
      name: row.userName,
      avatar: row.userAvatar
    },
    agent: {
      id: row.agent.id,
      title: row.agent.title,
      desc: row.agent.desc,
      coverImage: row.agent.coverImage,
      category: row.agent.category,
      authorId: row.agent.authorId || '',
      authorName: row.agent.authorName || authorExpert?.name || '作者'
    },
    agentAuthor: authorExpert
      ? {
          id: authorExpert.id,
          name: authorExpert.name,
          avatar: authorExpert.avatar,
          title: authorExpert.title
        }
      : row.agent.authorId
        ? {
            id: row.agent.authorId,
            name: row.agent.authorName || '作者',
            avatar: '',
            title: ''
          }
        : null
  };
}

async function likedShowcaseIds(viewerUserId: string | undefined, showcaseIds: string[]) {
  if (!viewerUserId || showcaseIds.length === 0) return new Set<string>();
  const rows = await prisma.agentShowcaseLike.findMany({
    where: { userId: viewerUserId, showcaseId: { in: showcaseIds } },
    select: { showcaseId: true }
  });
  return new Set(rows.map((row) => row.showcaseId));
}

export async function listPublicInspirations(viewerUserId?: string) {
  const rows = await prisma.agentShowcase.findMany({
    where: {
      featured: true,
      status: 'visible',
      agent: { status: 'published', creatorDeletedAt: null }
    },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      agent: {
        select: {
          id: true,
          title: true,
          desc: true,
          coverImage: true,
          category: true,
          authorId: true,
          authorName: true
        }
      }
    },
    take: 60
  });
  const authorIds = [...new Set(rows.map((row) => row.agent.authorId).filter(Boolean))] as string[];
  const experts = authorIds.length
    ? await prisma.expert.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, avatar: true, title: true }
      })
    : [];
  const expertById = new Map(experts.map((e) => [e.id, e]));
  const likedIds = await likedShowcaseIds(
    viewerUserId,
    rows.map((row) => row.id)
  );
  return rows.map((row) =>
    mapInspiration(
      row,
      row.agent.authorId ? expertById.get(row.agent.authorId) || null : null,
      likedIds.has(row.id)
    )
  );
}

export async function getPublicInspiration(id: string, viewerUserId?: string) {
  const row = await prisma.agentShowcase.findFirst({
    where: {
      id,
      status: 'visible',
      agent: { status: 'published', creatorDeletedAt: null }
    },
    include: {
      agent: {
        select: {
          id: true,
          title: true,
          desc: true,
          coverImage: true,
          category: true,
          authorId: true,
          authorName: true
        }
      }
    }
  });
  if (!row) return null;
  const expert = row.agent.authorId
    ? await prisma.expert.findUnique({
        where: { id: row.agent.authorId },
        select: { id: true, name: true, avatar: true, title: true }
      })
    : null;
  const likedIds = await likedShowcaseIds(viewerUserId, [row.id]);
  return mapInspiration(row, expert, likedIds.has(row.id));
}

export async function listAdminShowcases(input?: {
  featured?: boolean;
  category?: string;
  q?: string;
}) {
  const q = input?.q?.trim();
  const rows = await prisma.agentShowcase.findMany({
    where: {
      ...(typeof input?.featured === 'boolean' ? { featured: input.featured } : {}),
      ...(input?.category ? { inspireCategory: input.category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { userName: { contains: q } },
              { agent: { title: { contains: q } } }
            ]
          }
        : {})
    },
    include: {
      agent: {
        select: {
          id: true,
          title: true,
          category: true,
          coverImage: true,
          authorName: true
        }
      }
    },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: 300
  });
  return rows.map((row) => ({
    ...mapShowcase(row),
    agent: row.agent
  }));
}

async function resolveShowcaseNotifyUserId(input: {
  ownerUserId: string;
  agentAuthorId: string | null;
  likerUserId: string;
}) {
  if (input.ownerUserId && input.ownerUserId !== input.likerUserId) {
    const owner = await prisma.user.findUnique({
      where: { id: input.ownerUserId },
      select: { id: true }
    });
    if (owner) return owner.id;
  }
  if (!input.agentAuthorId) return null;
  const expert = await prisma.expert.findUnique({
    where: { id: input.agentAuthorId },
    select: { userId: true }
  });
  if (expert?.userId && expert.userId !== input.likerUserId) return expert.userId;
  return null;
}

export async function toggleShowcaseLike(input: { showcaseId: string; userId: string; userName?: string }) {
  const row = await prisma.agentShowcase.findFirst({
    where: {
      id: input.showcaseId,
      status: 'visible',
      agent: { status: 'published', creatorDeletedAt: null }
    },
    include: {
      agent: { select: { id: true, title: true, authorId: true } }
    }
  });
  if (!row) throw httpError('成果不存在或已隐藏', 404);

  const existing = await prisma.agentShowcaseLike.findUnique({
    where: { showcaseId_userId: { showcaseId: row.id, userId: input.userId } }
  });

  if (existing) {
    await prisma.$transaction([
      prisma.agentShowcaseLike.delete({ where: { id: existing.id } }),
      prisma.agentShowcase.update({
        where: { id: row.id },
        data: { likesCount: Math.max(0, row.likesCount - 1) }
      })
    ]);
    return { liked: false, likesCount: Math.max(0, row.likesCount - 1) };
  }

  const nextCount = row.likesCount + 1;
  await prisma.$transaction([
    prisma.agentShowcaseLike.create({
      data: {
        id: newLikeId(),
        showcaseId: row.id,
        userId: input.userId
      }
    }),
    prisma.agentShowcase.update({
      where: { id: row.id },
      data: { likesCount: nextCount }
    })
  ]);

  const notifyUserId = await resolveShowcaseNotifyUserId({
    ownerUserId: row.userId,
    agentAuthorId: row.agent.authorId,
    likerUserId: input.userId
  });
  if (notifyUserId) {
    const likerName = (input.userName || '有人').trim() || '有人';
    const title = row.title || '未命名成果';
    await notifyUser({
      userId: notifyUserId,
      type: 'showcase_like',
      title: '有人点赞了你的成果',
      body: `${likerName} 赞了「${title}」`,
      link: `/inspiration/${row.id}`,
      payload: {
        showcaseId: row.id,
        agentId: row.agent.id,
        agentTitle: row.agent.title,
        likerUserId: input.userId
      }
    });
  }

  return { liked: true, likesCount: nextCount };
}
