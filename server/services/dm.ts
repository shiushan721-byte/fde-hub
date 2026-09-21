import { prisma } from '../lib/prisma';
import { newId } from './customOrder';

export class DmError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const MAX_BODY = 500;
const PREVIEW_LEN = 80;

type ThreadRow = {
  id: string;
  userId: string;
  creatorUserId: string;
  expertId: string;
  lastMessageAt: Date | null;
  lastPreview: string;
  userUnread: number;
  creatorUnread: number;
  createdAt: Date;
  expert: { id: string; name: string; avatar: string };
  user: { id: string; name: string; avatar: string | null };
  creator: { id: string; name: string; avatar: string | null };
};

type MessageRow = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
};

function previewOf(body: string) {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > PREVIEW_LEN ? `${text.slice(0, PREVIEW_LEN)}…` : text;
}

function strangerState(messages: { senderId: string }[], myId: string) {
  const peerReplied = messages.some((m) => m.senderId !== myId);
  const mineCount = messages.filter((m) => m.senderId === myId).length;
  return {
    canSend: peerReplied || mineCount < 1,
    waitingReply: !peerReplied && mineCount >= 1
  };
}

function mapPeer(thread: ThreadRow, myId: string) {
  const iAmUser = thread.userId === myId;
  if (iAmUser) {
    return {
      id: thread.creatorUserId,
      expertId: thread.expertId,
      name: thread.expert.name || thread.creator.name,
      avatar: thread.expert.avatar || thread.creator.avatar || '',
      isCreator: true
    };
  }
  return {
    id: thread.userId,
    expertId: thread.expertId,
    name: thread.user.name,
    avatar: thread.user.avatar || '',
    isCreator: false
  };
}

function mapThread(thread: ThreadRow, myId: string, messages: { senderId: string }[]) {
  const iAmUser = thread.userId === myId;
  const { canSend, waitingReply } = strangerState(messages, myId);
  return {
    id: thread.id,
    expertId: thread.expertId,
    peer: mapPeer(thread, myId),
    lastPreview: thread.lastPreview,
    lastMessageAt: thread.lastMessageAt ? thread.lastMessageAt.toISOString() : null,
    unread: iAmUser ? thread.userUnread : thread.creatorUnread,
    canSend,
    waitingReply,
    createdAt: thread.createdAt.toISOString()
  };
}

function mapMessage(row: MessageRow, myId: string) {
  return {
    id: row.id,
    senderId: row.senderId,
    mine: row.senderId === myId,
    body: row.body,
    createdAt: row.createdAt.toISOString()
  };
}

const threadInclude = {
  expert: { select: { id: true, name: true, avatar: true } },
  user: { select: { id: true, name: true, avatar: true } },
  creator: { select: { id: true, name: true, avatar: true } }
} as const;

async function loadThreadOrThrow(threadId: string, myId: string) {
  const thread = await prisma.dmThread.findUnique({
    where: { id: threadId },
    include: threadInclude
  });
  if (!thread || (thread.userId !== myId && thread.creatorUserId !== myId)) {
    throw new DmError('会话不存在', 404, 'NOT_FOUND');
  }
  return thread;
}

async function senderIdsOf(threadId: string) {
  const rows = await prisma.dmMessage.findMany({
    where: { threadId },
    select: { senderId: true },
    orderBy: { createdAt: 'asc' }
  });
  return rows;
}

export async function unreadDmCount(userId: string) {
  const [asUser, asCreator] = await Promise.all([
    prisma.dmThread.aggregate({
      where: { userId, userUnread: { gt: 0 } },
      _sum: { userUnread: true }
    }),
    prisma.dmThread.aggregate({
      where: { creatorUserId: userId, creatorUnread: { gt: 0 } },
      _sum: { creatorUnread: true }
    })
  ]);
  return (asUser._sum.userUnread || 0) + (asCreator._sum.creatorUnread || 0);
}

export async function listDmThreads(userId: string) {
  const threads = await prisma.dmThread.findMany({
    where: { OR: [{ userId }, { creatorUserId: userId }] },
    include: threadInclude,
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }]
  });
  const ids = threads.map((t) => t.id);
  const senders = ids.length
    ? await prisma.dmMessage.findMany({
        where: { threadId: { in: ids } },
        select: { threadId: true, senderId: true },
        orderBy: { createdAt: 'asc' }
      })
    : [];
  const byThread = new Map<string, { senderId: string }[]>();
  for (const row of senders) {
    const list = byThread.get(row.threadId) || [];
    list.push({ senderId: row.senderId });
    byThread.set(row.threadId, list);
  }
  return threads.map((thread) => mapThread(thread, userId, byThread.get(thread.id) || []));
}

export async function getOrCreateDmThread(userId: string, expertId: string) {
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { id: true, userId: true, name: true, status: true }
  });
  if (!expert) throw new DmError('创作者不存在', 404, 'NOT_FOUND');
  if (!expert.userId) throw new DmError('该创作者暂不可私信', 400);
  if (expert.userId === userId) throw new DmError('不能给自己发私信', 400);

  const existing = await prisma.dmThread.findUnique({
    where: { userId_creatorUserId: { userId, creatorUserId: expert.userId } },
    include: threadInclude
  });
  if (existing) {
    const senders = await senderIdsOf(existing.id);
    return mapThread(existing, userId, senders);
  }

  const created = await prisma.dmThread.create({
    data: {
      id: newId('dmth'),
      userId,
      creatorUserId: expert.userId,
      expertId: expert.id
    },
    include: threadInclude
  });
  return mapThread(created, userId, []);
}

export async function listDmMessages(userId: string, threadId: string) {
  const thread = await loadThreadOrThrow(threadId, userId);
  const messages = await prisma.dmMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' }
  });
  await markDmRead(userId, threadId);
  const fresh = await loadThreadOrThrow(threadId, userId);
  return {
    thread: mapThread(
      fresh,
      userId,
      messages.map((m) => ({ senderId: m.senderId }))
    ),
    messages: messages.map((m) => mapMessage(m, userId))
  };
}

export async function markDmRead(userId: string, threadId: string) {
  const thread = await loadThreadOrThrow(threadId, userId);
  const iAmUser = thread.userId === userId;
  await prisma.dmThread.update({
    where: { id: threadId },
    data: iAmUser ? { userUnread: 0 } : { creatorUnread: 0 }
  });
  await prisma.dmMessage.updateMany({
    where: { threadId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() }
  });
  return { ok: true as const };
}

export async function sendDmMessage(userId: string, threadId: string, rawBody: string) {
  const body = rawBody.replace(/\r\n/g, '\n').trim();
  if (!body) throw new DmError('请输入消息内容');
  if (body.length > MAX_BODY) throw new DmError(`消息不能超过${MAX_BODY}字`);

  const thread = await loadThreadOrThrow(threadId, userId);
  const senders = await senderIdsOf(threadId);
  const { canSend } = strangerState(senders, userId);
  if (!canSend) {
    throw new DmError('对方回复前最多发送1条消息', 400, 'STRANGER_LIMIT');
  }

  const message = await prisma.dmMessage.create({
    data: {
      id: newId('dmmsg'),
      threadId,
      senderId: userId,
      body
    }
  });

  const iAmUser = thread.userId === userId;
  const updated = await prisma.dmThread.update({
    where: { id: threadId },
    data: {
      lastMessageAt: message.createdAt,
      lastPreview: previewOf(body),
      userUnread: iAmUser ? 0 : { increment: 1 },
      creatorUnread: iAmUser ? { increment: 1 } : 0
    },
    include: threadInclude
  });

  const nextSenders = [...senders, { senderId: userId }];
  return {
    thread: mapThread(updated, userId, nextSenders),
    message: mapMessage(message, userId)
  };
}
