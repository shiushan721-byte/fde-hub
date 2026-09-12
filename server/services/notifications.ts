import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';

export function newNotificationId() {
  return `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type NotifyClient = {
  userNotification: {
    create: (args: {
      data: {
        id: string;
        userId: string;
        type: string;
        title: string;
        body: string;
        link: string;
        payload: string;
      };
    }) => Promise<unknown>;
  };
};

export async function notifyUser(
  input: {
    userId?: string | null;
    type: string;
    title: string;
    body?: string;
    link?: string;
    payload?: unknown;
  },
  db: NotifyClient = prisma
) {
  const userId = (input.userId || '').trim();
  if (!userId) return;
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return;
  try {
    await db.userNotification.create({
      data: {
        id: newNotificationId(),
        userId,
        type: input.type,
        title: input.title,
        body: input.body || '',
        link: input.link || '',
        payload: toJson(input.payload ?? {})
      }
    });
  } catch (err) {
    console.warn('[notify]', input.type, err);
  }
}

export async function resolveExpertUserId(authorId?: string | null) {
  if (!authorId) return null;
  const expert = await prisma.expert.findUnique({
    where: { id: authorId },
    select: { userId: true }
  });
  return expert?.userId || null;
}

export function yuan(cents: number) {
  return `¥${(Math.max(0, cents) / 100).toFixed(2)}`;
}

export async function notifyExpertApplication(input: {
  userId: string;
  applicationId: string;
  applicationType?: string;
  event: 'submitted' | 'supplement' | 'approved' | 'rejected';
  reason?: string;
}) {
  const isUpgrade = input.applicationType === 'upgrade';
  const link = '/creator-center?tab=account';
  const payload = {
    applicationId: input.applicationId,
    applicationType: isUpgrade ? 'upgrade' : 'onboarding'
  };

  if (input.event === 'submitted') {
    await notifyUser({
      userId: input.userId,
      type: 'expert_application_submitted',
      title: isUpgrade ? '专家晋升申请已提交' : 'AI 专家入驻申请已提交',
      body: '运营将在 1–2 个工作日内完成审核，结果会通过站内信通知你。',
      link,
      payload
    });
    return;
  }

  if (input.event === 'supplement') {
    await notifyUser({
      userId: input.userId,
      type: 'expert_application_supplement',
      title: isUpgrade ? '晋升申请需补充资料' : '入驻申请需补充资料',
      body: input.reason || '请按审核意见补充后再提交。',
      link,
      payload
    });
    return;
  }

  if (input.event === 'approved') {
    await notifyUser({
      userId: input.userId,
      type: isUpgrade ? 'upgrade' : 'expert_application_approved',
      title: isUpgrade ? '专家晋升申请已通过' : '恭喜，你已通过 AI 专家入驻审核',
      body: isUpgrade
        ? '晋升申请已审核通过，可继续在创作者中心使用专家能力。'
        : '你已成为 HelloMe AI 专家，可以发布智能体并承接定制服务。',
      link,
      payload
    });
    return;
  }

  await notifyUser({
    userId: input.userId,
    type: 'expert_application_rejected',
    title: isUpgrade ? '专家晋升申请未通过' : 'AI 专家入驻申请未通过',
    body: input.reason || '请根据审核意见修改后重新提交。',
    link,
    payload: { ...payload, reason: input.reason || '' }
  });
}
