import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { writeAudit } from '../lib/audit';
import { parseJson } from '../lib/json';
import { agentToCatalog, agentToSolution, expertToPublic } from '../lib/mappers';
import { requireSuperAdmin } from '../middleware/auth';
import {
  approveApplication,
  freezeCertification,
  unfreezeCertification,
  writeCertEventStandalone
} from '../services/certification';

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

adminRouter.get('/agents', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const agents = await prisma.agent.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { authorName: { contains: q } },
              { category: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: { sortOrder: 'asc' }
  });
  return ok(res, agents.map((agent) => ({
    ...agent,
    catalog: agentToCatalog(agent),
    solution: agent.kind === 'solution' ? agentToSolution(agent) : null
  })));
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
  return ok(res, agent);
});

adminRouter.post('/agents/:id/offline', async (req, res) => {
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: { status: 'offline', showOnHome: false }
  });
  await writeAudit({
    actorId: actorId(req),
    action: 'offline_agent',
    targetType: 'agent',
    targetId: agent.id
  });
  return ok(res, agent);
});

adminRouter.get('/experts', async (_req, res) => {
  const experts = await prisma.expert.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { certification: true }
  });
  return ok(
    res,
    experts.map((expert) => ({
      ...expertToPublic(expert),
      certification: expert.certification
        ? {
            id: expert.certification.id,
            status: expert.certification.status,
            frozenAt: expert.certification.frozenAt,
            freezeReason: expert.certification.freezeReason
          }
        : null
    }))
  );
});

/** 专家资料编辑：禁止修改等级 / 认证状态 / 冻结 / 专家库资格 */
const expertPatch = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional()
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
  const expert = await prisma.expert.update({
    where: { id: req.params.id },
    data: parsed.data
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
  const leads = await prisma.consultationLead.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { messages: true }
  });
  return ok(res, leads);
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

function mapAdminApplication(item: {
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
}) {
  const snapshot = parseJson<Record<string, unknown>>(item.submittedProfileSnapshot, {});
  return {
    ...item,
    applicantName: String(snapshot.applicantName || item.user?.name || ''),
    expertTitle: String(snapshot.expertTitle || ''),
    bio: String(snapshot.bio || ''),
    domainTags: Array.isArray(snapshot.domainTags) ? snapshot.domainTags : [],
    contactPhone: String(snapshot.contactPhone || ''),
    contactEmail: String(snapshot.contactEmail || ''),
    profile: snapshot,
    rejectReason: item.decisionReason
  };
}

adminRouter.get('/expert-applications', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const items = await prisma.expertApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });
  return ok(res, items.map(mapAdminApplication));
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
    application: mapAdminApplication(item),
    realName: realName
      ? {
          status: realName.status,
          realNameMasked: realName.realNameMasked,
          idCardMasked: realName.idCardMasked,
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
  try {
    const result = await approveApplication(req.params.id, actorId(req));
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

adminRouter.get('/audit-logs', async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: { actor: { select: { id: true, name: true, email: true, role: true } } }
  });
  return ok(res, logs.map((log) => ({ ...log, diff: parseJson(log.diff, {}) })));
});
