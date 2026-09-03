import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { writeAudit } from '../lib/audit';
import { parseJson, toJson } from '../lib/json';
import { agentToCatalog, agentToSolution, expertToPublic } from '../lib/mappers';
import { engagementTotals } from '../lib/engagement';
import { requireSuperAdmin } from '../middleware/auth';
import {
  approveApplication,
  freezeCertification,
  unfreezeCertification,
  writeCertEventStandalone
} from '../services/certification';
import { markWithdrawalPaid, releasePendingIncomes, reviewWithdrawal } from '../services/wallet';
import {
  getFinanceSettings,
  updateFinanceSettings
} from '../services/financeSettings';
import {
  backfillFinanceJournals,
  listFinanceAccounts,
  listFinanceLedgerEntries
} from '../services/platformFinance';
import {
  countPendingCommentReports,
  dismissCommentReport,
  listCommentReports,
  removeCommentForReport
} from '../services/agentCommentReports';
import {
  countExpertsByTagName,
  createExpertTag,
  listExpertTags,
  listExpertsUsingTag,
  offlineExpertTag,
  onlineExpertTag,
  updateExpertTag,
  validateActiveDomainTags
} from '../services/expertTags';
import {
  countExpertsByTitleName,
  createExpertTitle,
  listExpertTitles,
  listExpertsUsingTitle,
  offlineExpertTitle,
  onlineExpertTitle,
  updateExpertTitle,
  validateActiveExpertTitle
} from '../services/expertTitles';

export const adminRouter = Router();

function actorId(req: { user?: { id: string } }) {
  return req.user?.id;
}

adminRouter.get('/dashboard', async (_req, res) => {
  const [
    publishedAgents,
    offlineAgents,
    reviewAgents,
    listedExperts,
    newLeads,
    pendingApplications,
    users,
    recentLeads,
    recentLogs,
    recentApplications
  ] = await Promise.all([
    prisma.agent.count({ where: { status: 'published' } }),
    prisma.agent.count({ where: { status: 'offline' } }),
    prisma.agent.count({ where: { status: 'in_review' } }),
    prisma.expert.count({ where: { listed: true } }),
    prisma.consultationLead.count({ where: { status: 'new' } }),
    prisma.expertApplication.count({
      where: { status: { in: ['pending', 'under_review', 'supplement_required'] } }
    }),
    prisma.user.count(),
    prisma.consultationLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { messages: true }
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: true }
    }),
    prisma.expertApplication.findMany({
      where: { status: { in: ['pending', 'under_review'] } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { user: { select: { name: true } } }
    })
  ]);

  return ok(res, {
    metrics: {
      publishedAgents,
      offlineAgents,
      reviewAgents,
      listedExperts,
      newLeads,
      pendingApplications,
      users
    },
    recentLeads,
    recentLogs,
    recentApplications: recentApplications.map((item) => {
      const snapshot = parseJson<Record<string, unknown>>(item.submittedProfileSnapshot, {});
      return {
        id: item.id,
        applicantName: String(snapshot.applicantName || item.user?.name || ''),
        type: item.type,
        status: item.status
      };
    })
  });
});

adminRouter.get('/home', async (_req, res) => {
  const [banners, categories, settings] = await Promise.all([
    prisma.homeBanner.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.siteSetting.findMany()
  ]);
  return ok(res, { banners, categories, settings });
});

const bannerPatch = z.object({
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

adminRouter.patch('/home/banners/:id', async (req, res) => {
  const parsed = bannerPatch.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  const banner = await prisma.homeBanner.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'update_banner',
    targetType: 'home_banner',
    targetId: banner.id,
    diff: parsed.data
  });
  return ok(res, banner);
});

const categoryPatch = z.object({
  name: z.string().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

adminRouter.patch('/home/categories/:id', async (req, res) => {
  const parsed = categoryPatch.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'update_category',
    targetType: 'category',
    targetId: category.id,
    diff: parsed.data
  });
  return ok(res, category);
});

const settingPatch = z.object({
  value: z.string()
});

adminRouter.patch('/settings/:key', async (req, res) => {
  const parsed = settingPatch.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  if (req.params.key === 'platform.commissionRate' && req.user?.role !== 'super_admin') {
    return fail(res, '运营人员不能修改分成比例', 403, 'FORBIDDEN');
  }
  const setting = await prisma.siteSetting.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value },
    create: { key: req.params.key, value: parsed.data.value }
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'update_setting',
    targetType: 'site_setting',
    targetId: setting.key,
    diff: parsed.data
  });
  return ok(res, setting);
});

function adminAgentStatusWhere(status?: string) {
  if (!status) return {};
  if (status === 'deleted') {
    return { creatorDeletedAt: { not: null } };
  }
  return {
    status,
    creatorDeletedAt: null
  };
}

adminRouter.get('/agents', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const authorId = typeof req.query.authorId === 'string' ? req.query.authorId.trim() : '';
  const agents = await prisma.agent.findMany({
    where: {
      ...adminAgentStatusWhere(status),
      ...(authorId ? { authorId } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q } },
              { title: { contains: q } },
              { authorName: { contains: q } },
              { category: { contains: q } },
              { desc: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });
  const authorIds = Array.from(
    new Set(agents.map((a) => a.authorId).filter((id): id is string => Boolean(id)))
  );
  const authors = authorIds.length
    ? await prisma.expert.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, expertNo: true, name: true }
      })
    : [];
  const authorById = new Map(authors.map((a) => [a.id, a]));
  const agentIds = agents.map((a) => a.id);
  const commentCounts =
    agentIds.length === 0
      ? []
      : await prisma.agentComment.groupBy({
          by: ['agentId'],
          where: { agentId: { in: agentIds } },
          _count: { _all: true }
        });
  const commentCountByAgent = new Map(
    commentCounts.map((row) => [row.agentId, row._count._all])
  );

  const latestCommentRows =
    agentIds.length === 0
      ? []
      : await prisma.agentComment.findMany({
          where: { agentId: { in: agentIds } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            agentId: true,
            userName: true,
            content: true,
            isAuthor: true,
            parentId: true,
            createdAt: true
          }
        });
  const latestCommentsByAgent = new Map<
    string,
    Array<{
      id: string;
      userName: string;
      content: string;
      isAuthor: boolean;
      isReply: boolean;
      createdAt: Date;
    }>
  >();
  for (const row of latestCommentRows) {
    const list = latestCommentsByAgent.get(row.agentId) || [];
    if (list.length >= 2) continue;
    list.push({
      id: row.id,
      userName: row.userName,
      content: row.content,
      isAuthor: row.isAuthor,
      isReply: Boolean(row.parentId),
      createdAt: row.createdAt
    });
    latestCommentsByAgent.set(row.agentId, list);
  }

  return ok(
    res,
    agents.map((agent) => {
      const payload = parseJson<Record<string, unknown>>(agent.solutionPayload, {});
      const skillPackage =
        payload.skillPackage && typeof payload.skillPackage === 'object'
          ? (payload.skillPackage as Record<string, unknown>)
          : null;
      const versionRaw =
        (typeof payload.version === 'string' && payload.version.trim()) ||
        (typeof skillPackage?.version === 'string' && skillPackage.version.trim()) ||
        'v1.0.0';
      const author = agent.authorId ? authorById.get(agent.authorId) : null;
      const commentsCount = commentCountByAgent.get(agent.id) ?? (Number(agent.commentsCount) || 0);
      const eng = engagementTotals(agent);
      return {
        ...agent,
        version: versionRaw.startsWith('v') ? versionRaw : `v${versionRaw}`,
        authorExpertNo: author?.expertNo || null,
        commentsCount,
        likesActual: eng.likesActual,
        likesManual: eng.likesManual,
        likesCount: eng.likesTotal,
        favoritesActual: eng.favoritesActual,
        favoritesManual: eng.favoritesManual,
        favoritesCount: eng.favoritesTotal,
        sharesActual: eng.sharesActual,
        sharesManual: eng.sharesManual,
        sharesCount: eng.sharesTotal,
        latestComments: latestCommentsByAgent.get(agent.id) || [],
        catalog: agentToCatalog(agent),
        solution: agent.kind === 'solution' ? agentToSolution(agent) : null
      };
    })
  );
});

const engagementManualPatch = z.object({
  metric: z.enum(['likes', 'favorites', 'shares']),
  manual: z.number().int().min(0).max(10_000_000)
});

adminRouter.patch('/agents/:id/engagement-manual', async (req, res) => {
  const parsed = engagementManualPatch.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent) return fail(res, '智能体不存在', 404, 'NOT_FOUND');

  const data =
    parsed.data.metric === 'likes'
      ? { likesManual: parsed.data.manual }
      : parsed.data.metric === 'favorites'
        ? { favoritesManual: parsed.data.manual }
        : { sharesManual: parsed.data.manual };

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data
  });
  const eng = engagementTotals(updated);
  await writeAudit({
    actorId: actorId(req),
    action: 'update_agent_engagement_manual',
    targetType: 'agent',
    targetId: agent.id,
    diff: { metric: parsed.data.metric, manual: parsed.data.manual }
  });
  return ok(res, {
    metric: parsed.data.metric,
    likesActual: eng.likesActual,
    likesManual: eng.likesManual,
    likesCount: eng.likesTotal,
    favoritesActual: eng.favoritesActual,
    favoritesManual: eng.favoritesManual,
    favoritesCount: eng.favoritesTotal,
    sharesActual: eng.sharesActual,
    sharesManual: eng.sharesManual,
    sharesCount: eng.sharesTotal
  });
});

adminRouter.get('/agents/:id/comments', async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, authorName: true }
  });
  if (!agent) return fail(res, '智能体不存在', 404, 'NOT_FOUND');

  const comments = await prisma.agentComment.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' }
  });

  const roots = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, typeof comments>();
  for (const c of comments) {
    if (!c.parentId) continue;
    const list = repliesByParent.get(c.parentId) || [];
    list.push(c);
    repliesByParent.set(c.parentId, list);
  }

  return ok(res, {
    agent,
    total: comments.length,
    comments: roots.map((root) => ({
      ...root,
      replies: (repliesByParent.get(root.id) || []).sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )
    }))
  });
});

adminRouter.delete('/agents/:agentId/comments/:commentId', async (req, res) => {
  const comment = await prisma.agentComment.findFirst({
    where: { id: req.params.commentId, agentId: req.params.agentId }
  });
  if (!comment) return fail(res, '评论不存在', 404, 'NOT_FOUND');

  // 删父评论时一并删除其回复
  await prisma.agentComment.deleteMany({
    where: {
      agentId: req.params.agentId,
      OR: [{ id: comment.id }, { parentId: comment.id }]
    }
  });

  const remaining = await prisma.agentComment.count({ where: { agentId: req.params.agentId } });
  await prisma.agent.update({
    where: { id: req.params.agentId },
    data: { commentsCount: String(remaining) }
  });

  await writeAudit({
    actorId: actorId(req),
    action: 'delete_agent_comment',
    targetType: 'agent_comment',
    targetId: comment.id,
    diff: { agentId: req.params.agentId, remaining }
  });

  return ok(res, { remaining });
});

const agentPatch = z.object({
  title: z.string().optional(),
  desc: z.string().optional(),
  category: z.string().optional(),
  badge: z.string().nullable().optional(),
  status: z.enum(['draft', 'in_review', 'published', 'offline']).optional(),
  showOnHome: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

adminRouter.patch('/agents/:id', async (req, res) => {
  const parsed = agentPatch.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'update_agent',
    targetType: 'agent',
    targetId: agent.id,
    diff: parsed.data
  });
  return ok(res, agent);
});

adminRouter.post('/agents/:id/publish', async (req, res) => {
  const publishSchema = z.object({
    category: z.string().min(1)
  });
  const parsed = publishSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '审核通过须选择行业分类');

  const current = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!current) return fail(res, '智能体不存在', 404, 'NOT_FOUND');
  if (current.creatorDeletedAt) {
    return fail(res, '该智能体已被创作者删除，无法重新上架');
  }
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: {
      status: 'published',
      category: parsed.data.category,
      showOnHome: current.kind === 'catalog' ? true : current.showOnHome
    }
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'publish_agent',
    targetType: 'agent',
    targetId: agent.id,
    diff: { category: parsed.data.category }
  });

  if (current.authorId) {
    const expert = await prisma.expert.findUnique({ where: { id: current.authorId } });
    if (expert?.userId) {
      await prisma.userNotification.create({
        data: {
          id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: expert.userId,
          type: 'agent_review_approved',
          title: '通用智能体审核已通过',
          body: `「${agent.title}」已通过平台审核并上架。`,
          link: '/creator-center?tab=my-agents',
          payload: JSON.stringify({
            agentId: agent.id,
            category: agent.category,
            agentTitle: agent.title
          })
        }
      });
    }
  }

  return ok(res, agent);
});

adminRouter.post('/agents/:id/reject', async (req, res) => {
  const reason = z.string().min(1).safeParse(req.body?.reason);
  if (!reason.success) return fail(res, '驳回必须填写理由');
  const current = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!current) return fail(res, '智能体不存在', 404, 'NOT_FOUND');
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: { status: 'offline', showOnHome: false }
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'reject_agent',
    targetType: 'agent',
    targetId: agent.id,
    diff: { reason: reason.data }
  });
  if (current.authorId) {
    const expert = await prisma.expert.findUnique({ where: { id: current.authorId } });
    if (expert?.userId) {
      await prisma.userNotification.create({
        data: {
          id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: expert.userId,
          type: 'agent_review_rejected',
          title: '通用智能体审核未通过',
          body: `「${agent.title}」被驳回：${reason.data}`,
          link: '/creator-center?tab=my-agents',
          payload: JSON.stringify({
            agentId: agent.id,
            reason: reason.data,
            agentTitle: agent.title
          })
        }
      });
    }
  }
  return ok(res, agent);
});

adminRouter.post('/agents/:id/offline', async (req, res) => {
  const reason = z.string().trim().min(1).safeParse(req.body?.reason);
  if (!reason.success) return fail(res, '下架必须填写原因');
  const current = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!current) return fail(res, '智能体不存在', 404, 'NOT_FOUND');
  if (current.creatorDeletedAt) {
    return ok(res, current);
  }
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: { status: 'offline', showOnHome: false }
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'offline_agent',
    targetType: 'agent',
    targetId: agent.id,
    diff: { reason: reason.data }
  });
  if (current.authorId) {
    const expert = await prisma.expert.findUnique({ where: { id: current.authorId } });
    if (expert?.userId) {
      await prisma.userNotification.create({
        data: {
          id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: expert.userId,
          type: 'agent_offline',
          title: '您的智能体已被平台下架',
          body: [
            `您的智能体「${agent.title}」已从智能体市场下架，当前仅自己可用。`,
            `下架原因：${reason.data}`,
            '请根据原因完成修改并更新 Skill，重新提交平台审核。审核通过后，才可再次公开到智能体市场。'
          ].join('\n'),
          link: '/creator-center?tab=my-agents',
          payload: JSON.stringify({
            agentId: agent.id,
            reason: reason.data,
            agentTitle: agent.title
          })
        }
      });
    }
  }
  return ok(res, agent);
});

adminRouter.get('/experts', async (_req, res) => {
  const experts = await prisma.expert.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { certification: true }
  });
  const expertIds = experts.map((e) => e.id);
  const userIds = experts.map((e) => e.userId).filter((id): id is string => Boolean(id));
  const [publishedCounts, applications, realNames, expertCases, wallets, users] = await Promise.all([
    expertIds.length
      ? prisma.agent.groupBy({
          by: ['authorId'],
          where: { authorId: { in: expertIds }, status: 'published', creatorDeletedAt: null },
          _count: { _all: true }
        })
      : Promise.resolve([]),
    expertIds.length
      ? prisma.expertApplication.findMany({
          where: { expertId: { in: expertIds }, status: 'approved' },
          orderBy: { createdAt: 'asc' },
          select: { expertId: true, createdAt: true, reviewedAt: true }
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.realNameVerification.findMany({
          where: { userId: { in: userIds }, status: 'verified' },
          orderBy: { verifiedAt: 'desc' },
          select: {
            userId: true,
            realName: true,
            realNameMasked: true,
            idCardMasked: true,
            idCardFrontUrl: true,
            idCardBackUrl: true
          }
        })
      : Promise.resolve([]),
    expertIds.length
      ? prisma.expertCase.findMany({
          where: { expertId: { in: expertIds } },
          select: { expertId: true, payload: true }
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.wallet.findMany({
          where: { userId: { in: userIds } },
          select: {
            userId: true,
            alipayBound: true,
            alipayAccount: true
          }
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, phone: true }
        })
      : Promise.resolve([])
  ]);
  const countByAuthor = new Map(
    publishedCounts.map((row) => [row.authorId || '', row._count._all])
  );
  const appliedAtByExpert = new Map<string, Date>();
  for (const app of applications) {
    if (!app.expertId || appliedAtByExpert.has(app.expertId)) continue;
    appliedAtByExpert.set(app.expertId, app.createdAt);
  }
  const rnByUserId = new Map<string, (typeof realNames)[number]>();
  for (const rn of realNames) {
    if (!rnByUserId.has(rn.userId)) rnByUserId.set(rn.userId, rn);
  }
  const casesByExpert = new Map<string, Record<string, unknown>[]>();
  for (const row of expertCases) {
    const list = casesByExpert.get(row.expertId) || [];
    list.push(parseJson<Record<string, unknown>>(row.payload, {}));
    casesByExpert.set(row.expertId, list);
  }
  const walletByUserId = new Map(wallets.map((w) => [w.userId, w]));
  const phoneByUserId = new Map(users.map((u) => [u.id, u.phone || '']));

  return ok(
    res,
    experts.map((expert) => {
      const pendingRaw = parseJson<Record<string, unknown>>(expert.pendingProfileSnapshot || '', {});
      const hasPending =
        Boolean(expert.pendingProfileSnapshot?.trim()) &&
        (typeof pendingRaw.name === 'string' ||
          typeof pendingRaw.bio === 'string' ||
          Array.isArray(pendingRaw.domainTags));
      const pendingProfile = hasPending
        ? {
            name: String(pendingRaw.name || expert.name),
            bio: String(pendingRaw.bio ?? ''),
            domainTags: Array.isArray(pendingRaw.domainTags)
              ? pendingRaw.domainTags.map(String)
              : []
          }
        : null;
      const rn = expert.userId ? rnByUserId.get(expert.userId) : null;
      const wallet = expert.userId ? walletByUserId.get(expert.userId) : null;
      return {
        ...expertToPublic(expert),
        publishedAgentsCount: countByAuthor.get(expert.id) || 0,
        appliedAt:
          appliedAtByExpert.get(expert.id)?.toISOString() ||
          expert.certification?.certifiedAt?.toISOString() ||
          expert.createdAt.toISOString(),
        pendingProfile,
        cases: casesByExpert.get(expert.id) || [],
        realName: rn?.realName || rn?.realNameMasked || '',
        idCardMasked: rn?.idCardMasked || '',
        idCardFrontUrl: rn?.idCardFrontUrl || '',
        idCardBackUrl: rn?.idCardBackUrl || '',
        alipayBound: wallet?.alipayBound || false,
        alipayAccount: wallet?.alipayAccount || '',
        phone: expert.userId ? phoneByUserId.get(expert.userId) || '' : '',
        adminNotes: expert.adminNotes || '',
        certification: expert.certification
          ? {
              id: expert.certification.id,
              status: expert.certification.status,
              frozenAt: expert.certification.frozenAt,
              freezeReason: expert.certification.freezeReason
            }
          : null
      };
    })
  );
});

/** 专家资料编辑：禁止修改等级 / 认证状态 / 冻结 / 专家库资格 */
const expertPatch = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  domainTags: z.array(z.string().min(1)).min(1).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  adminNotes: z.string().max(2000).optional()
});

adminRouter.patch('/experts/:id/admin-notes', async (req, res) => {
  const parsed = z.object({ adminNotes: z.string().max(2000) }).safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  try {
    const expert = await prisma.expert.update({
      where: { id: req.params.id },
      data: { adminNotes: parsed.data.adminNotes }
    });
    await writeAudit({
      actorId: actorId(req),
      action: 'update_expert_admin_notes',
      targetType: 'expert',
      targetId: expert.id,
      diff: { adminNotes: parsed.data.adminNotes }
    });
    return ok(res, { id: expert.id, adminNotes: expert.adminNotes || '' });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '保存备注失败');
  }
});

adminRouter.patch('/experts/:id', async (req, res) => {
  const parsed = expertPatch.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  if (
    req.body?.expertLevel !== undefined ||
    req.body?.verifyType !== undefined ||
    req.body?.verifyLabel !== undefined ||
    req.body?.status !== undefined ||
    req.body?.paused !== undefined ||
    req.body?.listed !== undefined
  ) {
    return fail(res, '等级、认证状态与专家库资格只能通过审核或冻结流程变更');
  }

  const { domainTags, ...rest } = parsed.data;
  const data: {
    name?: string;
    title?: string;
    bio?: string;
    domainTags?: string;
    featured?: boolean;
    sortOrder?: number;
    adminNotes?: string;
  } = { ...rest };

  if (domainTags) {
    try {
      const validated = await validateActiveDomainTags(domainTags);
      data.domainTags = toJson(validated);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : '专家标签无效');
    }
  }

  if (rest.title) {
    try {
      data.title = await validateActiveExpertTitle(rest.title);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : '专家头衔无效');
    }
  }

  if (Object.keys(data).length === 0) {
    return fail(res, '没有可更新的字段');
  }

  const expert = await prisma.expert.update({
    where: { id: req.params.id },
    data
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'update_expert',
    targetType: 'expert',
    targetId: expert.id,
    diff: parsed.data
  });
  return ok(res, expertToPublic(expert));
});

adminRouter.get('/leads', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const CONSULTING = new Set(['consulting', 'pending_quote']);

  const [leads, allOrders] = await Promise.all([
    prisma.consultationLead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 3 }
      }
    }),
    prisma.customOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        creator: { select: { id: true, name: true, email: true, phone: true } },
        instance: { select: { id: true, status: true, title: true } }
      }
    })
  ]);

  const expertIds = Array.from(
    new Set(
      [
        ...leads.map((l) => l.expertId),
        ...allOrders.map((o) => o.expertId)
      ].filter((id): id is string => Boolean(id))
    )
  );
  const experts = expertIds.length
    ? await prisma.expert.findMany({
        where: { id: { in: expertIds } },
        select: {
          id: true,
          name: true,
          title: true,
          userId: true,
          user: { select: { phone: true } }
        }
      })
    : [];
  const expertById = new Map(experts.map((e) => [e.id, e]));

  const orderByLeadId = new Map<string, (typeof allOrders)[number]>();
  allOrders.forEach((o) => {
    if (o.leadId) orderByLeadId.set(o.leadId, o);
  });

  function funnelFromOrder(order: {
    status: string;
    instanceId: string | null;
    instance?: { id: string } | null;
    proposalVersion: number;
  } | null): 'open' | 'converted' | 'closed' {
    if (!order) return 'open';
    if (order.status === 'closed' || order.status === 'dispute') return 'closed';
    if (
      Boolean(order.instanceId || order.instance) ||
      !CONSULTING.has(order.status) ||
      (order.proposalVersion || 0) > 0
    ) {
      return 'converted';
    }
    return 'open';
  }

  const fromLeads = leads.map((lead) => {
    const order = orderByLeadId.get(lead.id) || null;
    const expert = lead.expertId ? expertById.get(lead.expertId) || null : null;
    const payload = parseJson<Record<string, unknown>>(lead.payload, {});
    const requirement =
      lead.notes?.trim() ||
      lead.summary?.trim() ||
      (typeof payload.businessProblem === 'string' && payload.businessProblem.trim()) ||
      lead.messages[0]?.text?.trim() ||
      order?.serviceScope?.trim() ||
      order?.title?.trim() ||
      '';

    let funnelStatus = funnelFromOrder(order);
    if (lead.status === 'closed') funnelStatus = 'closed';

    return {
      id: lead.id,
      source: 'lead' as const,
      createdAt: lead.createdAt,
      clientName: lead.clientName,
      clientCompany: lead.clientCompany,
      contactPhone: lead.contactPhone,
      clientPhone: lead.user?.phone?.trim() || lead.contactPhone?.trim() || '',
      user: lead.user,
      expertId: lead.expertId,
      expertName: expert?.name || null,
      expertTitle: expert?.title || null,
      expertPhone: expert?.user?.phone?.trim() || '',
      agentId: lead.agentId || order?.baseAgentId || '',
      agentTitle: lead.agentTitle || order?.baseAgentTitle || '',
      requirement,
      summary: lead.summary,
      leadStatus: lead.status,
      adminContactStatus: lead.adminContactStatus || 'uncontacted',
      adminNotes: lead.adminNotes || '',
      funnelStatus,
      order: order
        ? {
            id: order.id,
            orderNo: order.orderNo,
            status: order.status,
            title: order.title,
            hasInstance: Boolean(order.instanceId || order.instance)
          }
        : null
    };
  });

  const leadIdSet = new Set(leads.map((l) => l.id));

  // 前台创作者端会把无 lead / lead 缺失的定制订单也展示为咨询卡片，后台对齐捞取
  const orderOnlyRows = allOrders
    .filter((order) => !order.leadId || !leadIdSet.has(order.leadId))
    .map((order) => {
      const expert = order.expertId ? expertById.get(order.expertId) || null : null;
      const requirement =
        order.serviceScope?.trim() ||
        order.quoteNote?.trim() ||
        order.title?.trim() ||
        '';
      return {
        id: `order:${order.id}`,
        source: 'order' as const,
        createdAt: order.createdAt,
        clientName: order.buyer?.name || '—',
        clientCompany: '',
        contactPhone: '',
        clientPhone: order.buyer?.phone?.trim() || '',
        user: order.buyer,
        expertId: order.expertId,
        expertName: expert?.name || order.creator?.name || null,
        expertTitle: expert?.title || null,
        expertPhone: expert?.user?.phone?.trim() || order.creator?.phone?.trim() || '',
        agentId: order.baseAgentId,
        agentTitle: order.baseAgentTitle,
        requirement,
        summary: order.title,
        leadStatus: order.status === 'closed' ? 'closed' : 'new',
        adminContactStatus: order.adminContactStatus || 'uncontacted',
        adminNotes: order.adminNotes || '',
        funnelStatus: funnelFromOrder(order),
        order: {
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          title: order.title,
          hasInstance: Boolean(order.instanceId || order.instance)
        }
      };
    });

  const mapped = [...fromLeads, ...orderOnlyRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filtered =
    status === 'converted' || status === 'closed' || status === 'open'
      ? mapped.filter((item) => item.funnelStatus === status)
      : mapped;

  return ok(res, filtered);
});

adminRouter.patch('/leads/:id/follow-up', async (req, res) => {
  const parsed = z
    .object({
      adminContactStatus: z.enum(['uncontacted', 'contacted']),
      adminNotes: z.string().max(2000)
    })
    .safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');

  const rowId = req.params.id;
  const isOrderRow = rowId.startsWith('order:');
  const targetId = isOrderRow ? rowId.slice('order:'.length) : rowId;

  try {
    if (isOrderRow) {
      const order = await prisma.customOrder.update({
        where: { id: targetId },
        data: parsed.data
      });
      await writeAudit({
        actorId: actorId(req),
        action: 'update_lead_follow_up',
        targetType: 'custom_order',
        targetId: order.id,
        diff: parsed.data
      });
      return ok(res, {
        id: rowId,
        adminContactStatus: order.adminContactStatus,
        adminNotes: order.adminNotes
      });
    }

    const lead = await prisma.consultationLead.update({
      where: { id: targetId },
      data: parsed.data
    });
    await writeAudit({
      actorId: actorId(req),
      action: 'update_lead_follow_up',
      targetType: 'lead',
      targetId: lead.id,
      diff: parsed.data
    });
    return ok(res, {
      id: lead.id,
      adminContactStatus: lead.adminContactStatus,
      adminNotes: lead.adminNotes
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '保存跟进失败');
  }
});

const leadPatch = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'signed', 'closed']).optional(),
  notes: z.string().optional(),
  assigneeId: z.string().nullable().optional()
});

adminRouter.patch('/leads/:id', async (req, res) => {
  const parsed = leadPatch.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  const lead = await prisma.consultationLead.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { messages: true }
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'update_lead',
    targetType: 'lead',
    targetId: lead.id,
    diff: parsed.data
  });
  return ok(res, lead);
});

function mapAdminApplication(
  item: {
    id: string;
    userId: string;
    type: string;
    status: string;
    submittedProfileSnapshot: string;
    realNameVerificationId: string | null;
    agreementVersion: string;
    agreementAcceptedAt: Date | null;
    reviewerId: string | null;
    reviewStartedAt: Date | null;
    reviewedAt: Date | null;
    decisionReason: string;
    supplementRequest: string;
    supplementSubmittedAt: Date | null;
    expertId: string | null;
    createdAt: Date;
    updatedAt: Date;
    user?: { id: string; name: string; email: string; role: string } | null;
  },
  expertMeta?: { expertNo?: string | null; name?: string | null } | null,
  realNameMeta?: {
    realName?: string | null;
    idCardMasked?: string | null;
    idCardFrontUrl?: string | null;
    idCardBackUrl?: string | null;
  } | null
) {
  const snapshot = parseJson<Record<string, unknown>>(item.submittedProfileSnapshot, {});
  return {
    ...item,
    applicantName: String(snapshot.applicantName || item.user?.name || ''),
    nickname: String(snapshot.nickname || snapshot.applicantName || ''),
    avatarUrl: String(snapshot.avatarUrl || snapshot.avatar || ''),
    expertTitle: String(snapshot.expertTitle || ''),
    bio: String(snapshot.bio || ''),
    domainTags: Array.isArray(snapshot.domainTags) ? snapshot.domainTags : [],
    contactPhone: String(snapshot.contactPhone || ''),
    contactEmail: String(snapshot.contactEmail || ''),
    profile: snapshot,
    rejectReason: item.decisionReason,
    /** 仅审核通过并落库专家后才有 */
    expertNo: expertMeta?.expertNo || null,
    realName: realNameMeta?.realName || '',
    idCardMasked: realNameMeta?.idCardMasked || '',
    idCardFrontUrl: realNameMeta?.idCardFrontUrl || '',
    idCardBackUrl: realNameMeta?.idCardBackUrl || ''
  };
}

adminRouter.get('/expert-applications', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const items = await prisma.expertApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });
  const expertIds = Array.from(
    new Set(items.map((item) => item.expertId).filter((id): id is string => Boolean(id)))
  );
  const experts = expertIds.length
    ? await prisma.expert.findMany({
        where: { id: { in: expertIds } },
        select: { id: true, expertNo: true, name: true }
      })
    : [];
  const expertById = new Map(experts.map((e) => [e.id, e]));

  const rnIds = Array.from(
    new Set(items.map((item) => item.realNameVerificationId).filter((id): id is string => Boolean(id)))
  );
  const userIdsNeedingRn = items
    .filter((item) => !item.realNameVerificationId)
    .map((item) => item.userId);
  const [linkedRn, fallbackRn] = await Promise.all([
    rnIds.length
      ? prisma.realNameVerification.findMany({
          where: { id: { in: rnIds } },
          select: {
            id: true,
            userId: true,
            realName: true,
            idCardMasked: true,
            realNameMasked: true,
            idCardFrontUrl: true,
            idCardBackUrl: true
          }
        })
      : Promise.resolve([]),
    userIdsNeedingRn.length
      ? prisma.realNameVerification.findMany({
          where: { userId: { in: userIdsNeedingRn }, status: 'verified' },
          orderBy: { verifiedAt: 'desc' },
          select: {
            id: true,
            userId: true,
            realName: true,
            idCardMasked: true,
            realNameMasked: true,
            idCardFrontUrl: true,
            idCardBackUrl: true
          }
        })
      : Promise.resolve([])
  ]);
  const rnById = new Map(linkedRn.map((r) => [r.id, r]));
  const rnByUserId = new Map<string, (typeof fallbackRn)[number]>();
  for (const r of fallbackRn) {
    if (!rnByUserId.has(r.userId)) rnByUserId.set(r.userId, r);
  }

  return ok(
    res,
    items.map((item) => {
      const rn =
        (item.realNameVerificationId ? rnById.get(item.realNameVerificationId) : null) ||
        rnByUserId.get(item.userId) ||
        null;
      const realNameMeta = rn
        ? {
            realName: rn.realName || rn.realNameMasked || '',
            idCardMasked: rn.idCardMasked || '',
            idCardFrontUrl: rn.idCardFrontUrl || '',
            idCardBackUrl: rn.idCardBackUrl || ''
          }
        : null;
      return mapAdminApplication(
        item,
        item.expertId ? expertById.get(item.expertId) : null,
        realNameMeta
      );
    })
  );
});

adminRouter.get('/expert-applications/:id', async (req, res) => {
  const item = await prisma.expertApplication.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });
  if (!item) return fail(res, '申请不存在', 404, 'NOT_FOUND');

  const [realName, certification, history, events] = await Promise.all([
    item.realNameVerificationId
      ? prisma.realNameVerification.findUnique({ where: { id: item.realNameVerificationId } })
      : prisma.realNameVerification.findFirst({
          where: { userId: item.userId, status: 'verified' },
          orderBy: { verifiedAt: 'desc' }
        }),
    prisma.expertCertification.findFirst({
      where: { userId: item.userId },
      orderBy: { certifiedAt: 'desc' }
    }),
    prisma.expertApplication.findMany({
      where: { userId: item.userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.expertCertificationEvent.findMany({
      where: { applicationId: item.id },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  return ok(res, {
    application: mapAdminApplication(item, null, realName
      ? {
          realName: realName.realName || realName.realNameMasked || '',
          idCardMasked: realName.idCardMasked || '',
          idCardFrontUrl: realName.idCardFrontUrl || '',
          idCardBackUrl: realName.idCardBackUrl || ''
        }
      : null),
    realName: realName
      ? {
          status: realName.status,
          realName: realName.realName || '',
          realNameMasked: realName.realNameMasked,
          idCardMasked: realName.idCardMasked,
          idCardFrontUrl: realName.idCardFrontUrl,
          idCardBackUrl: realName.idCardBackUrl,
          verifiedAt: realName.verifiedAt,
          provider: realName.provider
        }
      : null,
    certification,
    history: history.map(mapAdminApplication),
    events
  });
});

adminRouter.post('/expert-applications/:id/start-review', async (req, res) => {
  const application = await prisma.expertApplication.findUnique({ where: { id: req.params.id } });
  if (!application) return fail(res, '申请不存在', 404, 'NOT_FOUND');
  if (!['pending', 'supplement_required'].includes(application.status) && application.status !== 'under_review') {
    return fail(res, '该申请当前不可开始审核');
  }
  if (application.status === 'under_review') {
    return ok(res, mapAdminApplication(application));
  }

  const updated = await prisma.expertApplication.update({
    where: { id: application.id },
    data: {
      status: 'under_review',
      reviewerId: actorId(req),
      reviewStartedAt: new Date()
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });

  await writeCertEventStandalone(prisma, {
    userId: application.userId,
    expertId: application.expertId,
    applicationId: application.id,
    eventType: 'review_started',
    actorId: actorId(req),
    fromStatus: application.status,
    toStatus: 'under_review'
  });

  await writeAudit({
    actorId: actorId(req),
    action: 'start_review_expert_application',
    targetType: 'expert_application',
    targetId: application.id
  });

  return ok(res, mapAdminApplication(updated));
});

adminRouter.post('/expert-applications/:id/request-supplement', async (req, res) => {
  const message = z.string().min(1).parse(req.body?.message || req.body?.reason);
  const application = await prisma.expertApplication.findUnique({ where: { id: req.params.id } });
  if (!application) return fail(res, '申请不存在', 404, 'NOT_FOUND');
  if (!['pending', 'under_review'].includes(application.status)) {
    return fail(res, '该申请当前不可要求补充');
  }

  const updated = await prisma.expertApplication.update({
    where: { id: application.id },
    data: {
      status: 'supplement_required',
      supplementRequest: message,
      reviewerId: actorId(req)
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });

  await writeCertEventStandalone(prisma, {
    userId: application.userId,
    expertId: application.expertId,
    applicationId: application.id,
    eventType: 'supplement_requested',
    actorId: actorId(req),
    fromStatus: application.status,
    toStatus: 'supplement_required',
    reason: message
  });

  return ok(res, mapAdminApplication(updated));
});

adminRouter.post('/expert-applications/:id/approve', async (req, res) => {
  if (req.body?.level !== undefined || req.body?.targetLevel !== undefined) {
    return fail(res, '平台不分专家等级，审批不可传入等级字段');
  }
  const body = z
    .object({
      domainTags: z.array(z.string().min(1)).min(1, '请至少选择一个专家标签')
    })
    .safeParse(req.body);
  if (!body.success) {
    return fail(res, body.error.issues[0]?.message || '请至少选择一个专家标签');
  }
  try {
    const result = await approveApplication(req.params.id, actorId(req), {
      domainTags: body.data.domainTags
    });
    return ok(res, result.application);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '审批失败');
  }
});

adminRouter.post('/expert-applications/:id/reject', async (req, res) => {
  const reason = z.string().min(1).safeParse(req.body?.reason);
  if (!reason.success) return fail(res, '驳回必须填写原因');

  const application = await prisma.expertApplication.findUnique({ where: { id: req.params.id } });
  if (!application) return fail(res, '申请不存在', 404, 'NOT_FOUND');
  if (!['pending', 'under_review'].includes(application.status)) {
    return fail(res, '该申请当前不可驳回');
  }

  const updated = await prisma.expertApplication.update({
    where: { id: application.id },
    data: {
      status: 'rejected',
      decisionReason: reason.data,
      reviewerId: actorId(req),
      reviewedAt: new Date()
    }
  });

  await writeCertEventStandalone(prisma, {
    userId: application.userId,
    expertId: application.expertId,
    applicationId: application.id,
    eventType: 'application_rejected',
    actorId: actorId(req),
    fromStatus: application.status,
    toStatus: 'rejected',
    reason: reason.data
  });

  await writeAudit({
    actorId: actorId(req),
    action: 'reject_expert_application',
    targetType: 'expert_application',
    targetId: application.id,
    diff: { reason: reason.data }
  });

  return ok(res, updated);
});

adminRouter.post('/expert-certifications/:id/freeze', async (req, res) => {
  const reason = z.string().min(1).safeParse(req.body?.reason);
  if (!reason.success) return fail(res, '冻结必须填写原因');
  try {
    const cert = await freezeCertification({
      certificationId: req.params.id,
      actorId: actorId(req),
      reason: reason.data
    });
    return ok(res, cert);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '冻结失败');
  }
});

adminRouter.post('/expert-certifications/:id/unfreeze', async (req, res) => {
  const reason = z.string().min(1).safeParse(req.body?.reason || '复核通过，恢复认证');
  if (!reason.success) return fail(res, '解冻必须填写原因');
  try {
    const cert = await unfreezeCertification({
      certificationId: req.params.id,
      actorId: actorId(req),
      reason: reason.data
    });
    return ok(res, cert);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '解冻失败');
  }
});

adminRouter.get('/expert-certifications/:id/events', async (req, res) => {
  const cert = await prisma.expertCertification.findUnique({ where: { id: req.params.id } });
  if (!cert) return fail(res, '认证记录不存在', 404, 'NOT_FOUND');
  const events = await prisma.expertCertificationEvent.findMany({
    where: {
      OR: [{ certificationId: cert.id }, { expertId: cert.expertId }, { userId: cert.userId }]
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  return ok(res, events.map((e) => ({ ...e, payload: parseJson(e.payload, {}) })));
});

adminRouter.get('/private-instances', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const orderStatusesByStage: Record<string, string[]> = {
    consulting: ['consulting', 'pending_quote'],
    awaiting_proposal_confirm: ['awaiting_proposal_confirm'],
    awaiting_payment: ['awaiting_payment'],
    in_delivery: ['paid_pending_start', 'escrowed', 'in_development', 'revision'],
    in_review: ['in_review'],
    pending_acceptance: ['pending_acceptance'],
    completed: ['completed', 'pending_settlement'],
    closed: ['closed', 'dispute']
  };
  const orderStatuses = status ? orderStatusesByStage[status] : undefined;

  const items = await prisma.privateAgentInstance.findMany({
    where: {
      ...(orderStatuses
        ? { order: { status: { in: orderStatuses } } }
        : status
          ? { order: { status } }
          : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q } },
              { title: { contains: q } },
              { baseAgentTitle: { contains: q } },
              { order: { orderNo: { contains: q } } },
              { customer: { name: { contains: q } } }
            ]
          }
        : {})
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      customer: { select: { id: true, name: true, email: true } },
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          title: true,
          serviceScope: true,
          quoteNote: true,
          baseAgentTitle: true,
          baseAgentVersion: true,
          priceCents: true,
          deliveryDays: true,
          proposalVersion: true,
          proposalSubmittedAt: true,
          deliveryProposal: true,
          customizationSpec: true,
          creator: { select: { id: true, name: true, email: true } }
        }
      },
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, version: true, status: true, publishedAt: true }
      }
    }
  });
  return ok(
    res,
    items.map((item) => {
      const instanceSpec = parseJson<Record<string, unknown>>(item.customizationSpec, {});
      const orderSpec = parseJson<Record<string, unknown>>(item.order?.customizationSpec || '{}', {});
      const requirement =
        (typeof instanceSpec.need === 'string' && instanceSpec.need.trim()) ||
        (typeof orderSpec.need === 'string' && orderSpec.need.trim()) ||
        (typeof orderSpec.unsatisfiedAreas === 'string' && orderSpec.unsatisfiedAreas.trim()) ||
        (typeof orderSpec.businessProblem === 'string' && orderSpec.businessProblem.trim()) ||
        item.order?.serviceScope?.trim() ||
        item.order?.quoteNote?.trim() ||
        item.order?.title?.trim() ||
        '';
      const versionRaw =
        item.currentVersion ||
        item.deliveries[0]?.version ||
        item.baseAgentVersion ||
        'v1.0.0';
      return {
        ...item,
        version: versionRaw.startsWith('v') ? versionRaw : `v${versionRaw}`,
        requirement,
        desc: requirement,
        category: '定制专属',
        authorName: item.order?.creator?.name || null,
        customizationSpec: instanceSpec,
        latestDelivery: item.deliveries[0] || null,
        deliveries: undefined,
        order: item.order
          ? {
              ...item.order,
              customizationSpec: orderSpec,
              deliveryProposal: parseJson(item.order.deliveryProposal, {})
            }
          : null
      };
    })
  );
});

adminRouter.get('/delivery-versions', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending_ops_review';
  const items = await prisma.deliveryVersion.findMany({
    where: status ? { status } : undefined,
    orderBy: { submittedAt: 'desc' },
    include: {
      order: {
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } }
        }
      },
      instance: true
    }
  });
  return ok(
    res,
    items.map((item) => ({
      ...item,
      completedItems: parseJson(item.completedItems, []),
      skillPayload: parseJson(item.skillPayload, {}),
      hermesReport: parseJson(item.hermesReport, {}),
      order: {
        ...item.order,
        customizationSpec: parseJson(item.order.customizationSpec, {})
      },
      instance: {
        ...item.instance,
        customizationSpec: parseJson(item.instance.customizationSpec, {})
      }
    }))
  );
});

adminRouter.get('/delivery-versions/:id', async (req, res) => {
  const item = await prisma.deliveryVersion.findUnique({
    where: { id: req.params.id },
    include: {
      order: {
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
          events: { orderBy: { createdAt: 'asc' } }
        }
      },
      instance: true
    }
  });
  if (!item) return fail(res, '交付版本不存在', 404, 'NOT_FOUND');
  return ok(res, {
    ...item,
    completedItems: parseJson(item.completedItems, []),
    skillPayload: parseJson(item.skillPayload, {}),
    hermesReport: parseJson(item.hermesReport, {}),
    order: {
      ...item.order,
      customizationSpec: parseJson(item.order.customizationSpec, {})
    },
    instance: {
      ...item.instance,
      customizationSpec: parseJson(item.instance.customizationSpec, {})
    }
  });
});

adminRouter.post('/delivery-versions/:id/approve', async (req, res) => {
  try {
    const { approveDelivery } = await import('../services/customOrder');
    const order = await approveDelivery({
      deliveryId: req.params.id,
      reviewerId: actorId(req) || 'unknown'
    });
    return ok(res, order);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '审核通过失败');
  }
});

adminRouter.post('/delivery-versions/:id/reject', async (req, res) => {
  const reason = z.string().min(1).safeParse(req.body?.reason);
  if (!reason.success) return fail(res, '驳回必须填写原因');
  try {
    const { rejectDelivery } = await import('../services/customOrder');
    const delivery = await rejectDelivery({
      deliveryId: req.params.id,
      reviewerId: actorId(req) || 'unknown',
      reason: reason.data
    });
    return ok(res, delivery);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '驳回失败');
  }
});

adminRouter.get('/disputes', async (_req, res) => {
  const items = await prisma.customOrder.findMany({
    where: {
      OR: [{ status: 'dispute' }, { disputeStatus: 'open' }]
    },
    orderBy: { disputeOpenedAt: 'desc' },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } }
    }
  });
  return ok(res, items);
});

adminRouter.post('/custom-orders/:id/resolve-dispute', async (req, res) => {
  const resolution = z
    .enum(['continue_delivery', 'partial_refund', 'full_refund', 'confirm_complete'])
    .safeParse(req.body?.resolution);
  if (!resolution.success) return fail(res, '请选择判定结果');
  try {
    const { resolveDisputeByOps } = await import('../services/customOrder');
    const order = await resolveDisputeByOps({
      orderId: req.params.id,
      actorId: actorId(req) || 'unknown',
      resolution: resolution.data,
      note: typeof req.body?.note === 'string' ? req.body.note : undefined,
      refundCents:
        typeof req.body?.refundCents === 'number'
          ? req.body.refundCents
          : typeof req.body?.refundYuan === 'number'
            ? Math.round(req.body.refundYuan * 100)
            : undefined
    });
    return ok(res, order);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '判定失败');
  }
});

adminRouter.post('/jobs/custom-orders/run', async (_req, res) => {
  try {
    const { runCustomOrderJobs } = await import('../services/customOrderJobs');
    const result = await runCustomOrderJobs();
    return ok(res, result);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '任务执行失败');
  }
});

adminRouter.get('/users', requireSuperAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });
  return ok(res, users);
});

adminRouter.get('/payments', async (_req, res) => {
  const items = await prisma.paymentRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  const orderIds = [...new Set(items.map((p) => p.orderId))];
  const orders = orderIds.length
    ? await prisma.customOrder.findMany({
        where: { id: { in: orderIds } },
        select: {
          id: true,
          orderNo: true,
          title: true,
          status: true,
          paymentStatus: true,
          paymentChannel: true
        }
      })
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  return ok(
    res,
    items.map((p) => ({
      ...p,
      order: orderMap.get(p.orderId) || null
    }))
  );
});

adminRouter.get('/expert-accounts', async (_req, res) => {
  await releasePendingIncomes();
  const experts = await prisma.expert.findMany({
    where: { userId: { not: null } },
    orderBy: { sortOrder: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          wallet: true,
          withdrawals: {
            select: { id: true, amountCents: true, status: true }
          }
        }
      }
    }
  });

  return ok(
    res,
    experts
      .filter((expert) => expert.user)
      .map((expert) => {
        const user = expert.user!;
        const wallet = user.wallet;
        const withdrawals = user.withdrawals || [];
        const withdrawnTotalCents = withdrawals
          .filter((w) => w.status === 'paid' || w.status === 'succeeded')
          .reduce((sum, w) => sum + w.amountCents, 0);
        const inflight = withdrawals.filter((w) => w.status === 'pending' || w.status === 'approved');
        return {
          expertId: expert.id,
          expertNo: expert.expertNo,
          expertName: expert.name,
          userId: user.id,
          userName: user.name,
          email: user.email,
          pendingCents: wallet?.pendingCents || 0,
          availableCents: wallet?.availableCents || 0,
          frozenCents: wallet?.frozenCents || 0,
          withdrawnTotalCents,
          inflightCount: inflight.length,
          inflightCents: inflight.reduce((sum, w) => sum + w.amountCents, 0),
          wechatBound: wallet?.wechatBound || false,
          wechatAccount: wallet?.wechatAccount || '',
          alipayBound: wallet?.alipayBound || false,
          alipayAccount: wallet?.alipayAccount || ''
        };
      })
  );
});

adminRouter.get('/settlements', async (_req, res) => {
  const items = await prisma.customOrder.findMany({
    where: {
      status: {
        in: [
          'awaiting_payment',
          'paid_pending_start',
          'escrowed',
          'in_development',
          'in_review',
          'revision',
          'pending_acceptance',
          'pending_settlement',
          'completed'
        ]
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          expert: { select: { id: true, expertNo: true, name: true } }
        }
      }
    }
  });

  const leadIds = [...new Set(items.map((o) => o.leadId).filter(Boolean))] as string[];
  const leads = leadIds.length
    ? await prisma.consultationLead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true, contactPhone: true, clientName: true }
      })
    : [];
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  // 无关联线索时，用该买家最近一条线索手机号兜底
  const buyerIdsMissingPhone = [
    ...new Set(
      items
        .filter((o) => {
          const lead = o.leadId ? leadMap.get(o.leadId) : null;
          return !lead?.contactPhone;
        })
        .map((o) => o.buyerUserId)
    )
  ];
  const buyerLeads =
    buyerIdsMissingPhone.length > 0
      ? await prisma.consultationLead.findMany({
          where: {
            userId: { in: buyerIdsMissingPhone },
            contactPhone: { not: '' }
          },
          orderBy: { createdAt: 'desc' },
          select: { userId: true, contactPhone: true }
        })
      : [];
  const buyerPhoneMap = new Map<string, string>();
  for (const lead of buyerLeads) {
    if (lead.userId && !buyerPhoneMap.has(lead.userId)) {
      buyerPhoneMap.set(lead.userId, lead.contactPhone);
    }
  }

  return ok(
    res,
    items.map((order) => {
      const lead = order.leadId ? leadMap.get(order.leadId) : null;
      const expert = order.creator?.expert;
      return {
        id: order.id,
        orderNo: order.orderNo,
        title: order.title,
        baseAgentTitle: order.baseAgentTitle,
        baseAgentVersion: order.baseAgentVersion,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentChannel: order.paymentChannel,
        priceCents: order.priceCents,
        createdAt: order.createdAt,
        buyer: order.buyer
          ? {
              id: order.buyer.id,
              name: order.buyer.name,
              email: order.buyer.email,
              phone:
                lead?.contactPhone ||
                buyerPhoneMap.get(order.buyerUserId) ||
                (order.buyerUserId === 'user-demo' ? '13900001111' : '')
            }
          : null,
        seller: order.creator
          ? {
              id: expert?.expertNo || order.creator.id,
              name: expert?.name || order.creator.name,
              email: order.creator.email,
              phone: order.creator.phone || ''
            }
          : null
      };
    })
  );
});

adminRouter.get('/escrows', async (_req, res) => {
  const items = await prisma.customOrder.findMany({
    where: { paymentStatus: { in: ['escrowed', 'released'] } },
    orderBy: [{ settlementEligibleAt: 'asc' }, { updatedAt: 'desc' }],
    take: 200,
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          expert: { select: { id: true, expertNo: true, name: true } }
        }
      }
    }
  });

  const leadIds = [...new Set(items.map((o) => o.leadId).filter(Boolean))] as string[];
  const leads = leadIds.length
    ? await prisma.consultationLead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true, contactPhone: true }
      })
    : [];
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  const buyerIdsMissingPhone = [
    ...new Set(
      items
        .filter((o) => {
          const lead = o.leadId ? leadMap.get(o.leadId) : null;
          return !lead?.contactPhone;
        })
        .map((o) => o.buyerUserId)
    )
  ];
  const buyerLeads =
    buyerIdsMissingPhone.length > 0
      ? await prisma.consultationLead.findMany({
          where: {
            userId: { in: buyerIdsMissingPhone },
            contactPhone: { not: '' }
          },
          orderBy: { createdAt: 'desc' },
          select: { userId: true, contactPhone: true }
        })
      : [];
  const buyerPhoneMap = new Map<string, string>();
  for (const lead of buyerLeads) {
    if (lead.userId && !buyerPhoneMap.has(lead.userId)) {
      buyerPhoneMap.set(lead.userId, lead.contactPhone);
    }
  }

  return ok(
    res,
    items.map((order) => {
      const lead = order.leadId ? leadMap.get(order.leadId) : null;
      const expert = order.creator?.expert;
      return {
        id: order.id,
        orderNo: order.orderNo,
        title: order.title,
        baseAgentTitle: order.baseAgentTitle,
        baseAgentVersion: order.baseAgentVersion,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentChannel: order.paymentChannel,
        priceCents: order.priceCents,
        paidAt: order.paidAt,
        escrowedAt: order.escrowedAt,
        settlementEligibleAt: order.settlementEligibleAt,
        buyer: order.buyer
          ? {
              id: order.buyer.id,
              name: order.buyer.name,
              email: order.buyer.email,
              phone:
                lead?.contactPhone ||
                buyerPhoneMap.get(order.buyerUserId) ||
                (order.buyerUserId === 'user-demo' ? '13900001111' : '')
            }
          : null,
        seller: order.creator
          ? {
              id: expert?.expertNo || order.creator.id,
              name: expert?.name || order.creator.name,
              email: order.creator.email,
              phone: order.creator.phone || ''
            }
          : null
      };
    })
  );
});

adminRouter.get('/withdrawals', async (_req, res) => {
  const items = await prisma.withdrawal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          expert: { select: { name: true, expertNo: true } }
        }
      }
    }
  });
  return ok(res, items);
});

const withdrawReviewSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional()
});

adminRouter.post('/withdrawals/:id/review', async (req, res) => {
  const parsed = withdrawReviewSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  try {
    const item = await reviewWithdrawal({
      withdrawId: req.params.id,
      approved: parsed.data.approved,
      actorId: actorId(req) || '',
      reason: parsed.data.reason
    });
    await writeAudit({
      actorId: actorId(req),
      action: parsed.data.approved ? 'approve_withdrawal' : 'reject_withdrawal',
      targetType: 'withdrawal',
      targetId: item.id,
      diff: { status: item.status, reason: parsed.data.reason || '' }
    });
    return ok(res, item);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '审核失败');
  }
});

const withdrawPaidSchema = z.object({
  paidNote: z.string().min(1)
});

adminRouter.post('/withdrawals/:id/paid', async (req, res) => {
  const parsed = withdrawPaidSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请填写线下打款流水号或备注');
  try {
    const item = await markWithdrawalPaid({
      withdrawId: req.params.id,
      actorId: actorId(req) || '',
      paidNote: parsed.data.paidNote
    });
    await writeAudit({
      actorId: actorId(req),
      action: 'pay_withdrawal',
      targetType: 'withdrawal',
      targetId: item.id,
      diff: { status: item.status, paidNote: parsed.data.paidNote }
    });
    return ok(res, item);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '确认打款失败');
  }
});

adminRouter.get('/finance-settings', async (_req, res) => {
  const settings = await getFinanceSettings();
  return ok(res, { settings });
});

const financeSettingsSchema = z.object({
  fallbackFeeRateBps: z.number().int().min(0).max(10000).optional(),
  acceptanceDays: z.number().int().min(1).max(90).optional(),
  settlementHoldHours: z.number().int().min(0).max(720).optional(),
  pendingHoldDays: z.number().int().min(0).max(90).optional()
});

adminRouter.patch('/finance-settings', async (req, res) => {
  const parsed = financeSettingsSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  try {
    const settings = await updateFinanceSettings(parsed.data);
    await writeAudit({
      actorId: actorId(req),
      action: 'update_finance_settings',
      targetType: 'finance_settings',
      targetId: settings.id,
      diff: parsed.data
    });
    return ok(res, settings);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '保存失败');
  }
});

adminRouter.get('/finance-accounts', async (_req, res) => {
  const accounts = await listFinanceAccounts();
  return ok(
    res,
    accounts.map((a, index, arr) => ({
      ...a,
      serial: arr.length - index
    }))
  );
});

adminRouter.get('/finance-ledger', async (req, res) => {
  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
  const bizOrderNo = typeof req.query.bizOrderNo === 'string' ? req.query.bizOrderNo : undefined;
  const flowNo = typeof req.query.flowNo === 'string' ? req.query.flowNo : undefined;
  const bizType = typeof req.query.bizType === 'string' ? req.query.bizType : undefined;
  const dateFrom =
    typeof req.query.dateFrom === 'string' && req.query.dateFrom
      ? new Date(`${req.query.dateFrom}T00:00:00`)
      : undefined;
  const dateTo =
    typeof req.query.dateTo === 'string' && req.query.dateTo
      ? new Date(`${req.query.dateTo}T23:59:59.999`)
      : undefined;

  const items = await listFinanceLedgerEntries({
    accountId,
    bizOrderNo,
    flowNo,
    bizType,
    dateFrom,
    dateTo
  });
  return ok(res, items);
});

adminRouter.post('/finance-ledger/backfill', async (req, res) => {
  try {
    const result = await backfillFinanceJournals();
    await writeAudit({
      actorId: actorId(req),
      action: 'backfill_finance_ledger',
      targetType: 'finance_ledger',
      targetId: 'all',
      diff: result
    });
    return ok(res, result);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '补记账失败');
  }
});

adminRouter.get('/expert-tags', async (_req, res) => {
  const [tags, countByName] = await Promise.all([listExpertTags({ status: 'all' }), countExpertsByTagName()]);
  const withUsage = tags.map((tag) => ({
    ...tag,
    expertCount: countByName.get(tag.name) || 0
  }));
  return ok(res, withUsage);
});

adminRouter.get('/expert-tags/:id/experts', async (req, res) => {
  const tag = await prisma.expertTag.findUnique({ where: { id: req.params.id } });
  if (!tag) return fail(res, '标签不存在', 404, 'NOT_FOUND');
  const experts = await listExpertsUsingTag(tag.name);
  return ok(res, experts);
});

const expertTagCreateSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional()
});

adminRouter.post('/expert-tags', async (req, res) => {
  const parsed = expertTagCreateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  try {
    const tag = await createExpertTag(parsed.data);
    await writeAudit({
      actorId: actorId(req),
      action: 'create_expert_tag',
      targetType: 'expert_tag',
      targetId: tag.id,
      diff: parsed.data
    });
    return ok(res, tag);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '创建失败');
  }
});

adminRouter.patch('/expert-tags/:id', async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).optional(),
      sortOrder: z.number().int().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  try {
    const tag = await updateExpertTag(req.params.id, parsed.data);
    await writeAudit({
      actorId: actorId(req),
      action: 'update_expert_tag',
      targetType: 'expert_tag',
      targetId: tag.id,
      diff: parsed.data
    });
    return ok(res, tag);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '更新失败');
  }
});

adminRouter.post('/expert-tags/:id/offline', async (req, res) => {
  try {
    const tag = await offlineExpertTag(req.params.id);
    await writeAudit({
      actorId: actorId(req),
      action: 'offline_expert_tag',
      targetType: 'expert_tag',
      targetId: tag.id,
      diff: {}
    });
    return ok(res, tag);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '下架失败');
  }
});

adminRouter.post('/expert-tags/:id/online', async (req, res) => {
  try {
    const tag = await onlineExpertTag(req.params.id);
    await writeAudit({
      actorId: actorId(req),
      action: 'online_expert_tag',
      targetType: 'expert_tag',
      targetId: tag.id,
      diff: {}
    });
    return ok(res, tag);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '上架失败');
  }
});

adminRouter.get('/expert-titles', async (_req, res) => {
  const [titles, countByName] = await Promise.all([
    listExpertTitles({ status: 'all' }),
    countExpertsByTitleName()
  ]);
  const withUsage = titles.map((title) => ({
    ...title,
    expertCount: countByName.get(title.name) || 0
  }));
  return ok(res, withUsage);
});

adminRouter.get('/expert-titles/:id/experts', async (req, res) => {
  const title = await prisma.expertTitle.findUnique({ where: { id: req.params.id } });
  if (!title) return fail(res, '头衔不存在', 404, 'NOT_FOUND');
  const experts = await listExpertsUsingTitle(title.name);
  return ok(res, experts);
});

const expertTitleCreateSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional()
});

adminRouter.post('/expert-titles', async (req, res) => {
  const parsed = expertTitleCreateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  try {
    const title = await createExpertTitle(parsed.data);
    await writeAudit({
      actorId: actorId(req),
      action: 'create_expert_title',
      targetType: 'expert_title',
      targetId: title.id,
      diff: parsed.data
    });
    return ok(res, title);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '创建失败');
  }
});

adminRouter.patch('/expert-titles/:id', async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).optional(),
      sortOrder: z.number().int().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return fail(res, '参数不合法');
  try {
    const title = await updateExpertTitle(req.params.id, parsed.data);
    await writeAudit({
      actorId: actorId(req),
      action: 'update_expert_title',
      targetType: 'expert_title',
      targetId: title.id,
      diff: parsed.data
    });
    return ok(res, title);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '更新失败');
  }
});

adminRouter.post('/expert-titles/:id/offline', async (req, res) => {
  try {
    const title = await offlineExpertTitle(req.params.id);
    await writeAudit({
      actorId: actorId(req),
      action: 'offline_expert_title',
      targetType: 'expert_title',
      targetId: title.id,
      diff: {}
    });
    return ok(res, title);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '下架失败');
  }
});

adminRouter.post('/expert-titles/:id/online', async (req, res) => {
  try {
    const title = await onlineExpertTitle(req.params.id);
    await writeAudit({
      actorId: actorId(req),
      action: 'online_expert_title',
      targetType: 'expert_title',
      targetId: title.id,
      diff: {}
    });
    return ok(res, title);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '上架失败');
  }
});

adminRouter.get('/comment-reports/pending-count', async (_req, res) => {
  const count = await countPendingCommentReports();
  return ok(res, { count });
});

adminRouter.get('/comment-reports', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const reports = await listCommentReports(status);
  return ok(res, reports);
});

adminRouter.post('/comment-reports/:id/dismiss', async (req, res) => {
  const note = z.string().optional().parse(req.body?.note);
  try {
    const report = await dismissCommentReport(req.params.id, actorId(req), note);
    await writeAudit({
      actorId: actorId(req),
      action: 'dismiss_comment_report',
      targetType: 'agent_comment_report',
      targetId: report.id,
      diff: { note: note || '' }
    });
    return ok(res, report);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '操作失败');
  }
});

adminRouter.post('/comment-reports/:id/remove-comment', async (req, res) => {
  const note = z.string().optional().parse(req.body?.note);
  try {
    const report = await removeCommentForReport(req.params.id, actorId(req), note);
    await writeAudit({
      actorId: actorId(req),
      action: 'remove_comment_from_report',
      targetType: 'agent_comment_report',
      targetId: req.params.id,
      diff: { note: note || '' }
    });
    return ok(res, report);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '操作失败');
  }
});

adminRouter.get('/audit-logs', async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: { actor: { select: { id: true, name: true, email: true, role: true } } }
  });
  return ok(res, logs.map((log) => ({ ...log, diff: parseJson(log.diff, {}) })));
});
