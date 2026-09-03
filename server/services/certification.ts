import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';
import { EXPERT_VERIFY_META } from '../lib/mappers';
import { allocateNextExpertNo } from '../lib/expertNo';
import { validateActiveDomainTags } from './expertTags';

type Tx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const OPEN_APPLICATION_STATUSES = ['pending', 'under_review', 'supplement_required'] as const;

export function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function writeCertEvent(
  db: Tx,
  input: {
    userId: string;
    expertId?: string | null;
    applicationId?: string | null;
    certificationId?: string | null;
    eventType: string;
    actorId?: string | null;
    fromStatus?: string;
    toStatus?: string;
    reason?: string;
    payload?: unknown;
  }
) {
  await db.expertCertificationEvent.create({
    data: {
      id: newId('cevt'),
      userId: input.userId,
      expertId: input.expertId || undefined,
      applicationId: input.applicationId || undefined,
      certificationId: input.certificationId || undefined,
      eventType: input.eventType,
      actorId: input.actorId || undefined,
      fromStatus: input.fromStatus || '',
      toStatus: input.toStatus || '',
      reason: input.reason || '',
      payload: toJson(input.payload ?? {})
    }
  });
}

async function writeAuditTx(
  db: Tx,
  input: {
    actorId?: string;
    action: string;
    targetType: string;
    targetId: string;
    diff?: unknown;
  }
) {
  await db.auditLog.create({
    data: {
      id: newId('audit'),
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      diff: toJson(input.diff ?? {})
    }
  });
}

export async function getOpenApplication(userId: string) {
  return prisma.expertApplication.findFirst({
    where: { userId, status: { in: [...OPEN_APPLICATION_STATUSES] } },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getLatestVerifiedRealName(userId: string) {
  return prisma.realNameVerification.findFirst({
    where: { userId, status: 'verified' },
    orderBy: { verifiedAt: 'desc' }
  });
}

export async function getUserCertification(userId: string) {
  return prisma.expertCertification.findFirst({
    where: { userId },
    orderBy: { certifiedAt: 'desc' },
    include: { expert: true }
  });
}

export async function approveApplication(
  applicationId: string,
  actorId?: string,
  options?: { domainTags?: string[] }
) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.expertApplication.findUnique({ where: { id: applicationId } });
    if (!application) throw new Error('申请不存在');
    if (!['pending', 'under_review'].includes(application.status)) {
      throw new Error('该申请当前状态不可审批通过');
    }

    const existingCert = await tx.expertCertification.findFirst({
      where: { userId: application.userId },
      orderBy: { certifiedAt: 'desc' }
    });
    if (existingCert?.status === 'active') {
      throw new Error('用户已是有效 AI 专家，无需重复认证');
    }

    const meta = EXPERT_VERIFY_META;
    const snapshot = JSON.parse(application.submittedProfileSnapshot || '{}') as Record<string, any>;
    const displayName = String(snapshot.nickname || snapshot.applicantName || snapshot.name || 'AI 专家');
    const avatarUrl = String(snapshot.avatar || snapshot.avatarUrl || '');
    const snapshotDomains: string[] = Array.isArray(snapshot.domainTags)
      ? snapshot.domainTags.map(String)
      : [];
    const domains =
      options?.domainTags && options.domainTags.length > 0
        ? await validateActiveDomainTags(options.domainTags)
        : snapshotDomains.length > 0
          ? await validateActiveDomainTags(snapshotDomains)
          : [];
    if (domains.length === 0) {
      throw new Error('审批通过前请至少选择一个已上架的专家标签');
    }

    let expertId = existingCert?.expertId || application.expertId || newId('fde');
    const existingExpert = await tx.expert.findUnique({ where: { id: expertId } });

    if (existingExpert) {
      await tx.expert.update({
        where: { id: expertId },
        data: {
          userId: application.userId,
          name: displayName,
          avatar: avatarUrl || existingExpert.avatar,
          title: String(snapshot.expertTitle || existingExpert.title),
          bio: String(snapshot.bio || existingExpert.bio),
          domainTags: domains.length ? toJson(domains) : existingExpert.domainTags,
          location: String(snapshot.location || existingExpert.location),
          expertLevel: 1,
          ...meta,
          listed: true,
          paused: false,
          status: 'active'
        }
      });
    } else {
      const expertNo = await allocateNextExpertNo();
      await tx.expert.create({
        data: {
          id: expertId,
          userId: application.userId,
          expertNo,
          name: displayName,
          avatar:
            avatarUrl ||
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
          title: String(snapshot.expertTitle || 'AI 专家'),
          verifyType: meta.verifyType,
          verifyLabel: meta.verifyLabel,
          expertLevel: 1,
          roleTag: domains[0] ? `${domains[0]} 专家` : 'AI 专家',
          domainTags: toJson(domains),
          rating: 5,
          ordersCount: 0,
          praiseRate: 100,
          responseTime: '通常 24h 内响应',
          bio: String(snapshot.bio || '新入驻 AI 专家'),
          location: String(snapshot.location || '远程支持'),
          serviceModes: toJson(snapshot.serviceModes || ['远程交付']),
          guarantees: toJson(['已完成平台实名核验']),
          skills: toJson(domains.slice(0, 4)),
          stats: toJson({ publishedAgentsCount: 0 }),
          experienceYears: Number(snapshot.experienceYears || 1),
          featuredQuote: '“用可运行作品说话。”',
          socialLinks: toJson({}),
          listed: true,
          featured: false,
          paused: false,
          sortOrder: 999,
          status: 'active'
        }
      });
    }

    let certification;
    if (existingCert) {
      certification = await tx.expertCertification.update({
        where: { id: existingCert.id },
        data: {
          expertId,
          status: 'active',
          sourceApplicationId: application.id,
          certifiedAt: new Date(),
          frozenAt: null,
          freezeReason: '',
          frozenBy: null
        }
      });
    } else {
      certification = await tx.expertCertification.create({
        data: {
          id: newId('cert'),
          userId: application.userId,
          expertId,
          status: 'active',
          sourceApplicationId: application.id,
          certifiedAt: new Date()
        }
      });
    }

    await writeCertEvent(tx, {
      userId: application.userId,
      expertId,
      applicationId: application.id,
      certificationId: certification.id,
      eventType: 'certification_created',
      actorId,
      toStatus: 'active',
      reason: '入驻申请审核通过'
    });

    await tx.user.update({
      where: { id: application.userId },
      data: { role: 'expert' }
    });

    const updatedApp = await tx.expertApplication.update({
      where: { id: application.id },
      data: {
        status: 'approved',
        reviewerId: actorId,
        reviewedAt: new Date(),
        decisionReason: '',
        expertId
      }
    });

    await writeCertEvent(tx, {
      userId: application.userId,
      expertId,
      applicationId: application.id,
      certificationId: certification.id,
      eventType: 'application_approved',
      actorId,
      fromStatus: application.status,
      toStatus: 'approved'
    });

    if (actorId) {
      await writeAuditTx(tx, {
        actorId,
        action: 'approve_expert_application',
        targetType: 'expert_application',
        targetId: application.id,
        diff: { expertId }
      });
    }

    return { application: updatedApp, certification, expertId };
  });
}

export async function freezeCertification(input: {
  certificationId: string;
  actorId?: string;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const cert = await tx.expertCertification.findUnique({ where: { id: input.certificationId } });
    if (!cert) throw new Error('认证记录不存在');
    if (cert.status === 'frozen') throw new Error('认证已处于冻结状态');

    const updated = await tx.expertCertification.update({
      where: { id: cert.id },
      data: {
        status: 'frozen',
        frozenAt: new Date(),
        freezeReason: input.reason,
        frozenBy: input.actorId
      }
    });

    await tx.expert.update({
      where: { id: cert.expertId },
      data: { listed: false, paused: true, status: 'frozen' }
    });

    await writeCertEvent(tx, {
      userId: cert.userId,
      expertId: cert.expertId,
      certificationId: cert.id,
      eventType: 'certification_frozen',
      actorId: input.actorId,
      fromStatus: 'active',
      toStatus: 'frozen',
      reason: input.reason
    });

    if (input.actorId) {
      await writeAuditTx(tx, {
        actorId: input.actorId,
        action: 'freeze_certification',
        targetType: 'expert_certification',
        targetId: cert.id,
        diff: { reason: input.reason }
      });
    }

    return updated;
  });
}

export async function unfreezeCertification(input: {
  certificationId: string;
  actorId?: string;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const cert = await tx.expertCertification.findUnique({ where: { id: input.certificationId } });
    if (!cert) throw new Error('认证记录不存在');
    if (cert.status !== 'frozen') throw new Error('认证未冻结');

    const updated = await tx.expertCertification.update({
      where: { id: cert.id },
      data: {
        status: 'active',
        unfrozenAt: new Date(),
        unfrozenBy: input.actorId,
        freezeReason: ''
      }
    });

    await tx.expert.update({
      where: { id: cert.expertId },
      data: {
        listed: true,
        paused: false,
        status: 'active',
        expertLevel: 1,
        ...EXPERT_VERIFY_META
      }
    });

    await writeCertEvent(tx, {
      userId: cert.userId,
      expertId: cert.expertId,
      certificationId: cert.id,
      eventType: 'certification_unfrozen',
      actorId: input.actorId,
      fromStatus: 'frozen',
      toStatus: 'active',
      reason: input.reason
    });

    if (input.actorId) {
      await writeAuditTx(tx, {
        actorId: input.actorId,
        action: 'unfreeze_certification',
        targetType: 'expert_certification',
        targetId: cert.id,
        diff: { reason: input.reason }
      });
    }

    return updated;
  });
}

export { writeCertEvent as writeCertEventStandalone };
