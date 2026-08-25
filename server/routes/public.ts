import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { parseJson } from '../lib/json';
import { ok } from '../lib/http';
import { agentToCatalog, agentToSolution, expertToPublic } from '../lib/mappers';

export const publicRouter = Router();

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
      where: { kind: 'catalog', status: 'published', showOnHome: true },
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
      ...(kind ? { kind } : {})
    },
    orderBy: { sortOrder: 'asc' }
  });
  return ok(res, {
    catalog: agents.filter((a) => a.kind === 'catalog').map(agentToCatalog),
    solutions: agents.filter((a) => a.kind === 'solution').map(agentToSolution)
  });
});

publicRouter.get('/agents/:id', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent || agent.status !== 'published') {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '智能体不存在或已下架' } });
  }
  return ok(res, agent.kind === 'solution' ? agentToSolution(agent) : agentToCatalog(agent));
});

publicRouter.get('/experts', async (_req, res) => {
  const experts = await prisma.expert.findMany({
    where: { listed: true, status: 'active', paused: false }
  });
  const expertIds = experts.map((e) => e.id);
  const publishedCounts =
    expertIds.length === 0
      ? []
      : await prisma.agent.groupBy({
          by: ['authorId'],
          where: { authorId: { in: expertIds }, status: 'published' },
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
      const publishedAgentsCount = countByAuthor.get(expert.id) || 0;
      const stats =
        pub.stats && typeof pub.stats === 'object' && !Array.isArray(pub.stats)
          ? { ...(pub.stats as Record<string, unknown>), publishedAgentsCount }
          : { publishedAgentsCount };
      return { ...pub, stats };
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

  const [cases, reviews, services, solutions] = await Promise.all([
    prisma.expertCase.findMany({ where: { expertId: expert.id } }),
    prisma.expertReview.findMany({ where: { expertId: expert.id } }),
    prisma.expertService.findMany({ where: { expertId: expert.id } }),
    prisma.agent.findMany({
      where: { authorId: expert.id, kind: 'solution', status: 'published' },
      orderBy: { sortOrder: 'asc' }
    })
  ]);

  return ok(res, {
    expert: {
      ...expertToPublic(expert),
      certificationStatus: certStatus || (publiclyListed ? 'active' : undefined),
      certificationFrozen: certStatus === 'frozen'
    },
    cases: cases.map((item) => parseJson(item.payload, {})),
    reviews: reviews.map((item) => parseJson(item.payload, {})),
    packages: services.map((item) => parseJson(item.payload, {})),
    agents: solutions.map(agentToSolution)
  });
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
