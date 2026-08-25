import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { toJson } from '../lib/json';
import { requireAuth } from '../middleware/auth';
import { mockRealNameAdapter } from '../adapters/realName';
import {
  getLatestVerifiedRealName,
  getOpenApplication,
  getUserCertification,
  newId,
  writeCertEventStandalone
} from '../services/certification';

export const meRouter = Router();
meRouter.use(requireAuth);

const AGREEMENT_VERSION = 'v1';

function publicApplication(app: {
  id: string;
  type: string;
  status: string;
  submittedProfileSnapshot: string;
  agreementVersion: string;
  agreementAcceptedAt: Date | null;
  reviewStartedAt: Date | null;
  reviewedAt: Date | null;
  decisionReason: string;
  supplementRequest: string;
  supplementSubmittedAt: Date | null;
  expertId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const snapshot = JSON.parse(app.submittedProfileSnapshot || '{}') as Record<string, unknown>;
  // 前台不返回身份证号、手机号、后台备注类敏感字段
  const safeSnapshot = {
    applicantName: snapshot.applicantName,
    expertTitle: snapshot.expertTitle,
    bio: snapshot.bio,
    domainTags: snapshot.domainTags,
    location: snapshot.location,
    serviceModes: snapshot.serviceModes,
    caseDescription: snapshot.caseDescription,
    agentTitle: snapshot.agentTitle
  };
  return {
    id: app.id,
    type: app.type,
    status: app.status,
    profile: safeSnapshot,
    agreementVersion: app.agreementVersion,
    agreementAcceptedAt: app.agreementAcceptedAt,
    reviewStartedAt: app.reviewStartedAt,
    reviewedAt: app.reviewedAt,
    decisionReason: app.decisionReason,
    supplementRequest: app.supplementRequest,
    supplementSubmittedAt: app.supplementSubmittedAt,
    expertId: app.expertId,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt
  };
}

meRouter.get('/real-name-verification', async (req, res) => {
  const latest = await prisma.realNameVerification.findFirst({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' }
  });
  if (!latest) {
    return ok(res, { status: 'unverified' as const });
  }
  return ok(res, {
    id: latest.id,
    status: latest.status,
    realNameMasked: latest.realNameMasked,
    idCardMasked: latest.idCardMasked,
    verifiedAt: latest.verifiedAt,
    failReason: latest.failReason
  });
});

const startRealNameSchema = z.object({
  realName: z.string().min(1),
  idCardNumber: z.string().min(15)
});

meRouter.post('/real-name-verification', async (req, res) => {
  const parsed = startRealNameSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请提供姓名与身份证号');

  const existing = await getLatestVerifiedRealName(req.user!.id);
  if (existing) {
    return ok(res, {
      id: existing.id,
      status: existing.status,
      realNameMasked: existing.realNameMasked,
      idCardMasked: existing.idCardMasked,
      verifiedAt: existing.verifiedAt
    });
  }

  const verifying = await prisma.realNameVerification.create({
    data: {
      id: newId('rn'),
      userId: req.user!.id,
      status: 'verifying',
      provider: 'mock'
    }
  });

  const result = await mockRealNameAdapter.start({
    userId: req.user!.id,
    realName: parsed.data.realName,
    idCardNumber: parsed.data.idCardNumber
  });

  const updated = await prisma.realNameVerification.update({
    where: { id: verifying.id },
    data: {
      status: result.status,
      providerRef: result.providerRef,
      realNameMasked: result.realNameMasked,
      idCardMasked: result.idCardMasked,
      failReason: result.failReason || '',
      verifiedAt: result.status === 'verified' ? new Date() : null
    }
  });

  return ok(res, {
    id: updated.id,
    status: updated.status,
    realNameMasked: updated.realNameMasked,
    idCardMasked: updated.idCardMasked,
    verifiedAt: updated.verifiedAt,
    failReason: updated.failReason
  });
});

meRouter.get('/expert-certification', async (req, res) => {
  const cert = await getUserCertification(req.user!.id);
  if (!cert) return ok(res, null);
  return ok(res, {
    id: cert.id,
    expertId: cert.expertId,
    status: cert.status,
    certifiedAt: cert.certifiedAt,
    frozenAt: cert.frozenAt,
    freezeReason: cert.status === 'frozen' ? cert.freezeReason : undefined,
    expert: cert.expert
      ? {
          id: cert.expert.id,
          name: cert.expert.name,
          title: cert.expert.title,
          listed: cert.expert.listed,
          status: cert.expert.status
        }
      : null
  });
});

meRouter.get('/expert-applications', async (req, res) => {
  const items = await prisma.expertApplication.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' }
  });
  return ok(res, items.map(publicApplication));
});

meRouter.get('/expert-applications/:id', async (req, res) => {
  const app = await prisma.expertApplication.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!app) return fail(res, '申请不存在', 404, 'NOT_FOUND');
  return ok(res, publicApplication(app));
});

const createAppSchema = z.object({
  type: z.enum(['onboarding']).default('onboarding'),
  applicantName: z.string().min(1),
  expertTitle: z.string().min(1),
  bio: z.string().min(1),
  domainTags: z.array(z.string()).min(1),
  location: z.string().optional(),
  serviceModes: z.array(z.string()).optional(),
  caseDescription: z.string().optional(),
  agentTitle: z.string().optional(),
  agentCategory: z.string().optional(),
  selectedAgentId: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  agreementAccepted: z.literal(true),
  agreementVersion: z.string().default(AGREEMENT_VERSION)
});

meRouter.post('/expert-applications', async (req, res) => {
  const parsed = createAppSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '申请资料不完整或未确认协议');

  const userId = req.user!.id;
  const realName = await getLatestVerifiedRealName(userId);
  if (!realName) return fail(res, '请先完成实名认证');

  const open = await getOpenApplication(userId);
  if (open) return fail(res, '您已有进行中的申请，请勿重复提交');

  const cert = await getUserCertification(userId);
  if (cert?.status === 'frozen') return fail(res, '认证已冻结，无法提交申请');
  if (cert?.status === 'active') return fail(res, '您已是 AI 专家，无需重复申请');

  const data = parsed.data;

  const snapshot = {
    applicantName: data.applicantName,
    expertTitle: data.expertTitle,
    bio: data.bio,
    domainTags: data.domainTags,
    location: data.location || '',
    serviceModes: data.serviceModes || ['远程交付'],
    caseDescription: data.caseDescription || '',
    agentTitle: data.agentTitle || '',
    agentCategory: data.agentCategory || '',
    selectedAgentId: data.selectedAgentId || '',
    contactPhone: data.contactPhone || '',
    contactEmail: data.contactEmail || '',
    clientIp: req.ip,
    userAgent: req.get('user-agent') || ''
  };

  const application = await prisma.expertApplication.create({
    data: {
      id: newId('expapp'),
      userId,
      type: 'onboarding',
      status: 'pending',
      submittedProfileSnapshot: toJson(snapshot),
      realNameVerificationId: realName.id,
      agreementVersion: data.agreementVersion || AGREEMENT_VERSION,
      agreementAcceptedAt: new Date()
    }
  });

  await writeCertEventStandalone(prisma, {
    userId,
    applicationId: application.id,
    eventType: 'application_submitted',
    actorId: userId,
    toStatus: 'pending',
    payload: { type: 'onboarding' }
  });

  return ok(res, publicApplication(application), 201);
});

meRouter.post('/expert-applications/:id/supplement', async (req, res) => {
  const note = z.string().min(1).parse(req.body?.note || req.body?.caseDescription || '');
  const app = await prisma.expertApplication.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!app) return fail(res, '申请不存在', 404, 'NOT_FOUND');
  if (app.status !== 'supplement_required') return fail(res, '当前状态不可补充资料');

  const snapshot = JSON.parse(app.submittedProfileSnapshot || '{}') as Record<string, unknown>;
  const nextSnapshot = {
    ...snapshot,
    caseDescription: note,
    supplementNote: note,
    lastSupplementAt: new Date().toISOString()
  };

  const updated = await prisma.expertApplication.update({
    where: { id: app.id },
    data: {
      status: 'pending',
      submittedProfileSnapshot: toJson(nextSnapshot),
      supplementSubmittedAt: new Date(),
      decisionReason: ''
    }
  });

  await writeCertEventStandalone(prisma, {
    userId: app.userId,
    expertId: app.expertId,
    applicationId: app.id,
    eventType: 'supplement_submitted',
    actorId: req.user!.id,
    fromStatus: 'supplement_required',
    toStatus: 'pending',
    reason: note
  });

  return ok(res, publicApplication(updated));
});

meRouter.post('/expert-applications/:id/withdraw', async (req, res) => {
  const app = await prisma.expertApplication.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!app) return fail(res, '申请不存在', 404, 'NOT_FOUND');
  if (!['pending', 'supplement_required'].includes(app.status)) {
    return fail(res, '当前状态不可撤回');
  }

  const updated = await prisma.expertApplication.update({
    where: { id: app.id },
    data: { status: 'withdrawn' }
  });

  await writeCertEventStandalone(prisma, {
    userId: app.userId,
    expertId: app.expertId,
    applicationId: app.id,
    eventType: 'application_withdrawn',
    actorId: req.user!.id,
    fromStatus: app.status,
    toStatus: 'withdrawn'
  });

  return ok(res, publicApplication(updated));
});

meRouter.get('/notifications', async (req, res) => {
  const items = await prisma.userNotification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return ok(
    res,
    items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      payload: JSON.parse(n.payload || '{}'),
      read: n.read,
      createdAt: n.createdAt
    }))
  );
});

meRouter.post('/notifications/read-all', async (req, res) => {
  const result = await prisma.userNotification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true }
  });
  return ok(res, { updated: result.count });
});

meRouter.post('/notifications/:id/read', async (req, res) => {
  const item = await prisma.userNotification.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!item) return fail(res, '通知不存在', 404, 'NOT_FOUND');
  const updated = await prisma.userNotification.update({
    where: { id: item.id },
    data: { read: true }
  });
  return ok(res, { id: updated.id, read: updated.read });
});
