import { prisma } from '../lib/prisma';
import { isAgentAuthor } from './agentShowcases';
import { notifyUser, resolveExpertUserId } from './notifications';

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
    let parent: { id: string; userId: string | null; userName: string } | null = null;
    if (input.parentId) {
      parent = await prisma.agentComment.findFirst({
        where: { id: input.parentId, showcaseId: input.showcaseId, source: 'showcase' },
        select: { id: true, userId: true, userName: true }
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
    await notifyShowcaseComment({
      actorUserId: input.userId,
      actorName: row.userName,
      content,
      showcaseId: showcase.id,
      showcaseTitle: showcase.title || '未命名成果',
      agentId: showcase.agent.id,
      ownerUserId: showcase.userId,
      parentUserId: parent?.userId || null,
      isReply: Boolean(parent)
    });
    return mapPublicComment(row);
  }

  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, status: 'published', creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在或未上架', 404);

  let parent: { id: string; userId: string | null; userName: string } | null = null;
  if (input.parentId) {
    parent = await prisma.agentComment.findFirst({
      where: { id: input.parentId, agentId: input.agentId, source: 'agent' },
      select: { id: true, userId: true, userName: true }
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

  const authorUserId = await resolveExpertUserId(agent.authorId);
  await notifyAgentComment({
    actorUserId: input.userId,
    actorName: row.userName,
    content,
    agentId: agent.id,
    agentTitle: agent.title,
    authorUserId,
    parentUserId: parent?.userId || null,
    isReply: Boolean(parent),
    isAuthorReply: isAuthor
  });

  return mapPublicComment(row);
}

function preview(content: string) {
  const text = content.trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

async function notifyAgentComment(input: {
  actorUserId: string;
  actorName: string;
  content: string;
  agentId: string;
  agentTitle: string;
  authorUserId: string | null;
  parentUserId: string | null;
  isReply: boolean;
  isAuthorReply: boolean;
}) {
  const snippet = preview(input.content);
  const payload = {
    agentId: input.agentId,
    agentTitle: input.agentTitle,
    commenterUserId: input.actorUserId
  };

  if (input.isReply && input.parentUserId && input.parentUserId !== input.actorUserId) {
    await notifyUser({
      userId: input.parentUserId,
      type: input.isAuthorReply ? 'agent_comment_reply' : 'agent_comment',
      title: input.isAuthorReply
        ? `作者回复了你在「${input.agentTitle}」的评论`
        : `有人回复了你在「${input.agentTitle}」的评论`,
      body: `${input.actorName}：${snippet}`,
      link: `/agent/${input.agentId}`,
      payload
    });
  }

  if (
    input.authorUserId &&
    input.authorUserId !== input.actorUserId &&
    input.authorUserId !== input.parentUserId
  ) {
    await notifyUser({
      userId: input.authorUserId,
      type: 'agent_comment',
      title: `有人评论了你的智能体「${input.agentTitle}」`,
      body: `${input.actorName}：${snippet}`,
      link: `/agent/${input.agentId}`,
      payload
    });
  }
}

async function notifyShowcaseComment(input: {
  actorUserId: string;
  actorName: string;
  content: string;
  showcaseId: string;
  showcaseTitle: string;
  agentId: string;
  ownerUserId: string | null;
  parentUserId: string | null;
  isReply: boolean;
}) {
  const snippet = preview(input.content);
  const payload = {
    showcaseId: input.showcaseId,
    agentId: input.agentId,
    commenterUserId: input.actorUserId
  };

  if (input.isReply && input.parentUserId && input.parentUserId !== input.actorUserId) {
    await notifyUser({
      userId: input.parentUserId,
      type: 'showcase_reply',
      title: `有人回复了你在成果「${input.showcaseTitle}」的评论`,
      body: `${input.actorName}：${snippet}`,
      link: `/inspiration/${input.showcaseId}`,
      payload
    });
  }

  if (
    input.ownerUserId &&
    input.ownerUserId !== input.actorUserId &&
    input.ownerUserId !== input.parentUserId
  ) {
    await notifyUser({
      userId: input.ownerUserId,
      type: 'showcase_comment',
      title: `有人评论了你的成果「${input.showcaseTitle}」`,
      body: `${input.actorName}：${snippet}`,
      link: `/inspiration/${input.showcaseId}`,
      payload
    });
  }
}
