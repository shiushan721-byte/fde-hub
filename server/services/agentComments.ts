import { prisma } from '../lib/prisma';
import { isAgentAuthor } from './agentShowcases';

const CONTENT_MAX = 500;

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function newCommentId() {
  return `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export type CommentSource = 'agent' | 'showcase';

export function nestComments<
  T extends { id: string; parentId: string | null; createdAt: Date }
>(comments: T[]) {
  const roots = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, T[]>();
  for (const c of comments) {
    if (!c.parentId) continue;
    const list = repliesByParent.get(c.parentId) || [];
    list.push(c);
    repliesByParent.set(c.parentId, list);
  }
  return roots.map((root) => ({
    ...root,
    createdAt: root.createdAt instanceof Date ? root.createdAt.toISOString() : root.createdAt,
    replies: (repliesByParent.get(root.id) || [])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((reply) => ({
        ...reply,
        createdAt: reply.createdAt instanceof Date ? reply.createdAt.toISOString() : reply.createdAt
      }))
  }));
}

export function mapPublicComment(row: {
  id: string;
  userName: string;
  userAvatar: string;
  isAuthor: boolean;
  content: string;
  createdAt: string | Date;
  replies?: Array<{
    id: string;
    userName: string;
    userAvatar: string;
    isAuthor: boolean;
    content: string;
    createdAt: string | Date;
  }>;
}) {
  return {
    id: row.id,
    userName: row.userName,
    userAvatar: row.userAvatar,
    isAuthor: row.isAuthor,
    content: row.content,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
    replies: (row.replies || []).map((reply) => ({
      id: reply.id,
      userName: reply.userName,
      userAvatar: reply.userAvatar,
      isAuthor: reply.isAuthor,
      content: reply.content,
      createdAt: typeof reply.createdAt === 'string' ? reply.createdAt : reply.createdAt.toISOString()
    }))
  };
}

export async function listComments(input: { agentId?: string; showcaseId?: string; source: CommentSource }) {
  const comments = await prisma.agentComment.findMany({
    where:
      input.source === 'showcase'
        ? { showcaseId: input.showcaseId, source: 'showcase' }
        : { agentId: input.agentId, source: 'agent' },
    orderBy: { createdAt: 'desc' }
  });
  return nestComments(comments).map(mapPublicComment);
}

export async function createComment(input: {
  source: CommentSource;
  agentId: string;
  showcaseId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string;
}) {
  const content = input.content.trim().slice(0, CONTENT_MAX);
  if (!content) throw httpError('请填写评论内容', 400);

  if (input.source === 'showcase') {
    if (!input.showcaseId) throw httpError('成果不存在', 404);
    const showcase = await prisma.agentShowcase.findFirst({
      where: { id: input.showcaseId, status: 'visible' },
      include: { agent: { select: { id: true, authorId: true, status: true, creatorDeletedAt: true } } }
    });
    if (!showcase || showcase.agent.status !== 'published' || showcase.agent.creatorDeletedAt) {
      throw httpError('成果不存在或未公开', 404);
    }
    if (input.parentId) {
      const parent = await prisma.agentComment.findFirst({
        where: { id: input.parentId, showcaseId: input.showcaseId, source: 'showcase' }
      });
      if (!parent) throw httpError('回复的评论不存在', 404);
    }
    const isAuthor = Boolean(showcase.userId && showcase.userId === input.userId);
    const row = await prisma.agentComment.create({
      data: {
        id: newCommentId(),
        agentId: input.agentId,
        source: 'showcase',
        showcaseId: input.showcaseId,
        parentId: input.parentId || null,
        userId: input.userId,
        userName: input.userName.trim() || '用户',
        userAvatar: input.userAvatar || '',
        isAuthor,
        content
      }
    });
    return mapPublicComment(row);
  }

  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, status: 'published', creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在或未上架', 404);

  if (input.parentId) {
    const parent = await prisma.agentComment.findFirst({
      where: { id: input.parentId, agentId: input.agentId, source: 'agent' }
    });
    if (!parent) throw httpError('回复的评论不存在', 404);
  }

  const isAuthor = await isAgentAuthor(input.userId, agent.authorId);

  const row = await prisma.agentComment.create({
    data: {
      id: newCommentId(),
      agentId: input.agentId,
      source: 'agent',
      showcaseId: null,
      parentId: input.parentId || null,
      userId: input.userId,
      userName: input.userName.trim() || '用户',
      userAvatar: input.userAvatar || '',
      isAuthor,
      content
    }
  });

  const remaining = await prisma.agentComment.count({
    where: { agentId: input.agentId, source: 'agent' }
  });
  await prisma.agent.update({
    where: { id: input.agentId },
    data: { commentsCount: String(remaining) }
  });

  return mapPublicComment(row);
}
