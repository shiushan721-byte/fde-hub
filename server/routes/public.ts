import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { parseJson } from '../lib/json';
import { requireAuth } from '../middleware/auth';
import { agentToCatalog, agentToSolution, expertToPublic } from '../lib/mappers';
import { findExpertForUser } from '../services/creatorAgents';
import {
  COMMENT_REPORT_REASONS,
  createCommentReport,
  type CommentReportReason
} from '../services/agentCommentReports';
import {
  filterActiveDomainTags,
  getActiveExpertTagNameSet,
  listExpertTags
} from '../services/expertTags';
import { listExpertTitles } from '../services/expertTitles';
import { isAgentAuthor, listAgentShowcases, listPublicInspirations, getPublicInspiration } from '../services/agentShowcases';
import { createComment, listComments } from '../services/agentComments';
import { recommendAgents } from '../services/agentRecommend';

export const publicRouter = Router();

function isMarketplacePublic(agent: { status: string; creatorDeletedAt: Date | null }) {
  return agent.status === 'published' && !agent.creatorDeletedAt;
}

async function ensureAgentShareToken(agentId: string) {
  const existing = await prisma.agentShareLink.findFirst({
    where: { agentId },
    orderBy: { createdAt: 'desc' }
  });
  if (existing) return existing.token;
  const created = await prisma.agentShareLink.create({
    data: {
      id: `shr_${Date.now()}_${randomBytes(4).toString('hex')}`,
      agentId,
      token: randomBytes(16).toString('hex')
    }
  });
  return created.token;
}

async function hasValidShareToken(agentId: string, token: string) {
  if (!token) return false;
  const link = await prisma.agentShareLink.findFirst({
    where: { agentId, token }
  });
  return Boolean(link);
}

async function canViewAgent(
  agent: { id: string; status: string; creatorDeletedAt: Date | null },
  share: string
) {
  if (agent.creatorDeletedAt) return false;
  if (isMarketplacePublic(agent)) return true;
  return hasValidShareToken(agent.id, share);
}

publicRouter.get('/home', async (_req, res) => {
  const [banners, categories, agents, settings] = await Promise.all([
    prisma.homeBanner.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.category.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.agent.findMany({
      where: { kind: 'catalog', status: 'published', showOnHome: true, creatorDeletedAt: null },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }]
    }),
    prisma.siteSetting.findMany()
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return ok(res, {
    banners,
    categories: ['全部', ...categories.map((c) => c.name)],
    agents: agents.map(agentToCatalog),
    settings: {
      heroBrand: settingMap['home.heroBrand'] || 'Hellome',
      creatorCountLabel: settingMap['home.creatorCountLabel'] || '',
      sectionTitle: settingMap['home.sectionTitle'] || '热门智能体'
    }
  });
});

publicRouter.get('/agents', async (req, res) => {
  const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
  const agents = await prisma.agent.findMany({
    where: {
      status: 'published',
      creatorDeletedAt: null,
      ...(kind ? { kind } : {})
    },
    orderBy: { sortOrder: 'asc' }
  });
  return ok(res, {
    catalog: agents.filter((a) => a.kind === 'catalog').map(agentToCatalog),
    solutions: agents.filter((a) => a.kind === 'solution').map(agentToSolution)
  });
});

const recommendSchema = z.object({
  query: z.string().trim().min(2).max(500)
});

publicRouter.post('/agents/recommend', async (req, res) => {
  const parsed = recommendSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请用一两句话描述你想做什么');
  try {
    const result = await recommendAgents(parsed.data.query);
    return ok(res, result);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '推荐失败，请稍后重试');
  }
});

publicRouter.get('/agents/:id', async (req, res) => {
  const share = typeof req.query.share === 'string' ? req.query.share.trim() : '';
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '智能体不存在或已下架' } });
  }
  if (!(await canViewAgent(agent, share))) {
    return res.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: share ? '分享链接无效或已失效' : '智能体不存在或已下架' }
    });
  }
  return ok(res, {
    ...agentToCatalog(agent),
    sharedAccess: !isMarketplacePublic(agent)
  });
});

publicRouter.post('/agents/:id/share-link', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent) {
    return fail(res, '智能体不存在', 404, 'NOT_FOUND');
  }
  if (agent.creatorDeletedAt) {
    return fail(res, '智能体已删除，无法分享', 404, 'NOT_FOUND');
  }
  const isPublic = isMarketplacePublic(agent);
  const bodyShare =
    req.body && typeof req.body === 'object' && typeof req.body.share === 'string'
      ? req.body.share.trim()
      : '';

  if (!isPublic) {
    let allowed = false;
    if (req.user) {
      if (req.user.role === 'super_admin' || req.user.role === 'operator') {
        allowed = true;
      } else {
        const expert = await findExpertForUser(req.user.id);
        if (expert && expert.id === agent.authorId) allowed = true;
      }
    }
    if (!allowed && bodyShare) {
      allowed = await hasValidShareToken(agent.id, bodyShare);
    }
    if (!allowed) {
      return fail(res, '仅创作者可分享未公开的智能体', 403, 'FORBIDDEN');
    }
  }

  const token = await ensureAgentShareToken(agent.id);
  return ok(res, {
    public: isPublic,
    token,
    path: `/#/agent/${encodeURIComponent(agent.id)}?share=${token}`
  });
});

publicRouter.get('/expert-tags', async (_req, res) => {
  const tags = await listExpertTags({ status: 'active' });
  return ok(res, tags.map((t) => ({ id: t.id, name: t.name, sortOrder: t.sortOrder })));
});

publicRouter.get('/expert-titles', async (_req, res) => {
  const titles = await listExpertTitles({ status: 'active' });
  return ok(res, titles.map((t) => ({ id: t.id, name: t.name, sortOrder: t.sortOrder })));
});

publicRouter.get('/experts', async (_req, res) => {
  const activeTagNames = await getActiveExpertTagNameSet();
  const experts = await prisma.expert.findMany({
    where: { listed: true, status: 'active', paused: false }
  });
  const expertIds = experts.map((e) => e.id);
  const publishedCounts =
    expertIds.length === 0
      ? []
      : await prisma.agent.groupBy({
          by: ['authorId'],
          where: { authorId: { in: expertIds }, status: 'published', creatorDeletedAt: null },
          _count: { _all: true }
        });
  const countByAuthor = new Map(
    publishedCounts.map((row) => [row.authorId || '', row._count._all])
  );

  // 前台排序：推荐优先，同档再按已上架智能体数量降序，最后用 sortOrder 兜底
  experts.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const countA = countByAuthor.get(a.id) || 0;
    const countB = countByAuthor.get(b.id) || 0;
    if (countA !== countB) return countB - countA;
    return a.sortOrder - b.sortOrder;
  });

  return ok(
    res,
    experts.map((expert) => {
      const pub = expertToPublic(expert);
      const domainTags = filterActiveDomainTags(pub.domainTags, activeTagNames);
      const publishedAgentsCount = countByAuthor.get(expert.id) || 0;
      const stats =
        pub.stats && typeof pub.stats === 'object' && !Array.isArray(pub.stats)
          ? { ...(pub.stats as Record<string, unknown>), publishedAgentsCount }
          : { publishedAgentsCount };
      return { ...pub, domainTags, stats };
    })
  );
});

publicRouter.get('/experts/:id', async (req, res) => {
  const expert = await prisma.expert.findUnique({
    where: { id: req.params.id },
    include: { certification: true }
  });
  if (!expert) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '专家不存在' } });
  }

  const certStatus = expert.certification?.status;
  const publiclyListed = expert.listed && expert.status === 'active' && !expert.paused;
  // 冻结后保留主页地址，但不出现在专家库；未认证且未公开则 404
  if (!publiclyListed && certStatus !== 'frozen') {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '专家不存在或未公开' } });
  }

  const [cases, reviews, services, solutions, activeTagNames] = await Promise.all([
    prisma.expertCase.findMany({ where: { expertId: expert.id } }),
    prisma.expertReview.findMany({ where: { expertId: expert.id } }),
    prisma.expertService.findMany({ where: { expertId: expert.id } }),
    prisma.agent.findMany({
      where: { authorId: expert.id, kind: 'solution', status: 'published', creatorDeletedAt: null },
      orderBy: { sortOrder: 'asc' }
    }),
    getActiveExpertTagNameSet()
  ]);

  const pub = expertToPublic(expert);
  return ok(res, {
    expert: {
      ...pub,
      domainTags: filterActiveDomainTags(pub.domainTags, activeTagNames),
      certificationStatus: certStatus || (publiclyListed ? 'active' : undefined),
      certificationFrozen: certStatus === 'frozen'
    },
    cases: cases.map((item) => parseJson(item.payload, {})),
    reviews: reviews.map((item) => parseJson(item.payload, {})),
    packages: services.map((item) => parseJson(item.payload, {})),
    agents: solutions.map(agentToSolution)
  });
});

publicRouter.get('/agents/:id/comments', async (req, res) => {
  const share = typeof req.query.share === 'string' ? req.query.share.trim() : '';
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, status: true, creatorDeletedAt: true }
  });
  if (!agent || !(await canViewAgent(agent, share))) {
    return fail(res, '智能体不存在或未上架', 404, 'NOT_FOUND');
  }

  const comments = await listComments({ agentId: agent.id, source: 'agent' });
  return ok(res, { total: comments.length, comments });
});

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(500),
  parentId: z.string().optional()
});

const reportSchema = z.object({
  reason: z.enum(['spam', 'abuse', 'illegal', 'false_info', 'other']),
  detail: z.string().max(500).optional().default('')
});

publicRouter.post('/agents/:id/comments', requireAuth, async (req, res) => {
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请填写评论内容');
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, avatar: true }
    });
    const item = await createComment({
      source: 'agent',
      agentId: req.params.id,
      userId: req.user!.id,
      userName: user?.name || req.user!.name,
      userAvatar: user?.avatar || '',
      content: parsed.data.content,
      parentId: parsed.data.parentId
    });
    return ok(res, item, 201);
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return fail(res, error instanceof Error ? error.message : '评论失败', status);
  }
});

publicRouter.get('/inspirations', async (_req, res) => {
  const items = await listPublicInspirations();
  return ok(res, { items, total: items.length });
});

publicRouter.get('/inspirations/:id', async (req, res) => {
  const item = await getPublicInspiration(req.params.id);
  if (!item) return fail(res, '成果不存在或已隐藏', 404, 'NOT_FOUND');
  return ok(res, item);
});

publicRouter.get('/inspirations/:id/comments', async (req, res) => {
  const item = await getPublicInspiration(req.params.id);
  if (!item) return fail(res, '成果不存在或已隐藏', 404, 'NOT_FOUND');
  const comments = await listComments({
    agentId: item.agent.id,
    showcaseId: item.id,
    source: 'showcase'
  });
  return ok(res, { total: comments.length, comments });
});

publicRouter.post('/inspirations/:id/comments', requireAuth, async (req, res) => {
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请填写评论内容');
  const item = await getPublicInspiration(req.params.id);
  if (!item) return fail(res, '成果不存在或已隐藏', 404, 'NOT_FOUND');
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, avatar: true }
    });
    const comment = await createComment({
      source: 'showcase',
      agentId: item.agent.id,
      showcaseId: item.id,
      userId: req.user!.id,
      userName: user?.name || req.user!.name,
      userAvatar: user?.avatar || '',
      content: parsed.data.content,
      parentId: parsed.data.parentId
    });
    return ok(res, comment, 201);
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return fail(res, error instanceof Error ? error.message : '评论失败', status);
  }
});

publicRouter.post('/inspirations/:id/comments/:commentId/report', requireAuth, async (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '举报原因无效');
  const item = await getPublicInspiration(req.params.id);
  if (!item) return fail(res, '成果不存在或已隐藏', 404, 'NOT_FOUND');
  try {
    const report = await createCommentReport({
      agentId: item.agent.id,
      commentId: req.params.commentId,
      reason: parsed.data.reason as CommentReportReason,
      detail: parsed.data.detail,
      reporterUserId: req.user!.id,
      reporterName: req.user!.name,
      source: 'showcase',
      showcaseId: item.id
    });
    return ok(res, { id: report.id }, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '举报失败');
  }
});

publicRouter.get('/agents/:id/showcases', async (req, res) => {
  const share = typeof req.query.share === 'string' ? req.query.share.trim() : '';
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, status: true, creatorDeletedAt: true }
  });
  if (!agent || !(await canViewAgent(agent, share))) {
    return fail(res, '智能体不存在或未上架', 404, 'NOT_FOUND');
  }
  const canModerate = await isAgentAuthor(req.user?.id, agent.authorId);
  const items = await listAgentShowcases({
    agentId: agent.id,
    viewerUserId: req.user?.id,
    isAuthor: canModerate
  });
  return ok(res, { items, canModerate, viewerUserId: req.user?.id || null });
});

publicRouter.get('/comment-report-reasons', (_req, res) => {
  return ok(res, COMMENT_REPORT_REASONS);
});

publicRouter.post('/agents/:agentId/comments/:commentId/report', requireAuth, async (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '举报原因无效');

  try {
    const report = await createCommentReport({
      agentId: req.params.agentId,
      commentId: req.params.commentId,
      reason: parsed.data.reason as CommentReportReason,
      detail: parsed.data.detail,
      reporterUserId: req.user!.id,
      reporterName: req.user!.name
    });
    return ok(res, { id: report.id }, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '举报失败');
  }
});

publicRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { visible: true },
    orderBy: { sortOrder: 'asc' }
  });
  return ok(res, categories);
});

publicRouter.post('/events', async (_req, res) => {
  return ok(res, { recorded: true }, 202);
});
