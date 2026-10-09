import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import { newId } from './certification';
import { rebateCentsFrom, resolveRebateRate, type RebateRateRow } from '../../shared/rebate';

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

const SPEC_PATH = path.resolve(process.cwd(), 'server/assets/rebate-skill-spec.md');

export function readRebateSkillSpec() {
  return readFileSync(SPEC_PATH, 'utf8');
}

async function requireExpert(userId: string) {
  const expert = await prisma.expert.findFirst({ where: { userId } });
  if (!expert) throw httpError('仅认证专家可参与使用返点', 403);
  return expert;
}

export async function getRebateCampaign(userId: string) {
  const expert = await requireExpert(userId);
  const enrollment = await prisma.rebateEnrollment.findUnique({ where: { expertId: expert.id } });
  const owned = await prisma.agent.findMany({
    where: { authorId: expert.id, creatorDeletedAt: null },
    select: { id: true, title: true, status: true },
    orderBy: { updatedAt: 'desc' }
  });
  const accesses = await prisma.agentRebateAccess.findMany({
    where: { expertId: expert.id }
  });
  const accessByAgent = new Map(accesses.map((row) => [row.agentId, row]));
  const rates = await applicableRates(expert.id, owned.map((row) => row.id));
  return {
    expertId: expert.id,
    expertName: expert.name,
    enrollment: enrollment
      ? {
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt.toISOString(),
          specDownloadedAt: enrollment.specDownloadedAt?.toISOString() || null
        }
      : null,
    agents: owned.map((agent) => {
      const access = accessByAgent.get(agent.id);
      return {
        agentId: agent.id,
        title: agent.title,
        agentStatus: agent.status,
        status: access?.status || 'pending',
        checkedAt: access?.checkedAt?.toISOString() || null,
        qualifiedAt: access?.qualifiedAt?.toISOString() || null
      };
    }),
    rates
  };
}

async function applicableRates(expertId: string, agentIds: string[]) {
  const now = new Date();
  const rows = await prisma.rebateRate.findMany({
    where: {
      effectiveFrom: { lte: now },
      OR: [
        { scope: 'platform' },
        { scope: 'expert', expertId },
        { scope: 'agent', agentId: { in: agentIds.length ? agentIds : ['__none__'] } }
      ]
    },
    orderBy: { effectiveFrom: 'desc' }
  });
  const models = [...new Set(rows.map((row) => row.modelId))];
  return models.map((modelId) => {
    const resolved = resolveRebateRate(rows, { agentId: '', expertId, modelId, at: now });
    const agentRates = agentIds.map((agentId) => {
      const hit = resolveRebateRate(rows, { agentId, expertId, modelId, at: now });
      return hit
        ? {
            agentId,
            scope: hit.scope,
            rateBps: hit.rateBps,
            effectiveFrom: new Date(hit.effectiveFrom).toISOString()
          }
        : null;
    }).filter(Boolean);
    return {
      modelId,
      platform: resolved && resolved.scope === 'platform'
        ? { rateBps: resolved.rateBps, effectiveFrom: new Date(resolved.effectiveFrom).toISOString() }
        : null,
      appliedToExpert: resolveRebateRate(
        rows.filter((row) => row.scope !== 'agent'),
        { agentId: '', expertId, modelId, at: now }
      ),
      agents: agentRates
    };
  }).map((row) => ({
    modelId: row.modelId,
    expertRateBps: row.appliedToExpert?.rateBps ?? null,
    expertScope: row.appliedToExpert?.scope ?? null,
    effectiveFrom: row.appliedToExpert
      ? new Date(row.appliedToExpert.effectiveFrom).toISOString()
      : null,
    agents: row.agents
  }));
}

export async function enrollRebate(userId: string) {
  const expert = await requireExpert(userId);
  const existing = await prisma.rebateEnrollment.findUnique({ where: { expertId: expert.id } });
  if (existing) return getRebateCampaign(userId);
  await prisma.rebateEnrollment.create({
    data: {
      id: newId('rebate'),
      expertId: expert.id,
      userId,
      status: 'enrolled'
    }
  });
  return getRebateCampaign(userId);
}

export async function markSpecDownloaded(userId: string) {
  const expert = await requireExpert(userId);
  const enrollment = await prisma.rebateEnrollment.findUnique({ where: { expertId: expert.id } });
  if (enrollment && !enrollment.specDownloadedAt) {
    await prisma.rebateEnrollment.update({
      where: { id: enrollment.id },
      data: {
        specDownloadedAt: new Date(),
        status: enrollment.status === 'enrolled' ? 'spec_downloaded' : enrollment.status
      }
    });
  }
  return readRebateSkillSpec();
}

export async function checkAgentRebate(userId: string, agentId: string) {
  const expert = await requireExpert(userId);
  const enrollment = await prisma.rebateEnrollment.findUnique({ where: { expertId: expert.id } });
  if (!enrollment?.specDownloadedAt) throw httpError('请先下载 Skill 接入规范', 400);
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, authorId: expert.id, creatorDeletedAt: null }
  });
  if (!agent) throw httpError('智能体不存在', 404);
  const now = new Date();
  const current = await prisma.agentRebateAccess.findUnique({ where: { agentId } });
  if (!current) {
    await prisma.agentRebateAccess.create({
      data: {
        id: newId('raccess'),
        agentId,
        expertId: expert.id,
        status: 'passed',
        checkedAt: now
      }
    });
  } else if (current.status !== 'active') {
    await prisma.agentRebateAccess.update({
      where: { agentId },
      data: { checkedAt: now, status: 'passed', qualifiedAt: null }
    });
  } else {
    await prisma.agentRebateAccess.update({
      where: { agentId },
      data: { checkedAt: now }
    });
  }
  return getRebateCampaign(userId);
}

export async function enableAgentRebate(userId: string, agentId: string) {
  const expert = await requireExpert(userId);
  const access = await prisma.agentRebateAccess.findUnique({ where: { agentId } });
  if (!access || access.expertId !== expert.id) throw httpError('请先完成接入检查', 400);
  if (access.status === 'paused') throw httpError('该智能体返点已被暂停', 409);
  if (access.status !== 'passed' && access.status !== 'active') {
    throw httpError('请先完成接入检查', 400);
  }
  await prisma.agentRebateAccess.update({
    where: { agentId },
    data: {
      status: 'active',
      qualifiedAt: access.qualifiedAt || new Date()
    }
  });
  return getRebateCampaign(userId);
}

export async function ensureOfficialKey(userId: string) {
  const existing = await prisma.officialApiKey.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  if (existing) return existing;
  const secret = `hm_live_${randomBytes(18).toString('hex')}`;
  return prisma.officialApiKey.create({
    data: {
      id: newId('okey'),
      userId,
      keyPrefix: secret.slice(0, 12),
      secretHash: createHash('sha256').update(secret).digest('hex')
    }
  });
}

type RecordUsageInput = {
  idempotencyKey: string;
  userId: string;
  agentId: string;
  modelId: string;
  channel: 'official' | 'self';
  tokens: number;
  amountCents: number;
  occurredAt: Date;
};

export async function recordModelUsage(input: RecordUsageInput) {
  const existing = await prisma.modelUsage.findUnique({
    where: { idempotencyKey: input.idempotencyKey }
  });
  if (existing) return existing;

  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, creatorDeletedAt: null }
  });
  if (!agent?.authorId) throw httpError('智能体不存在', 404);
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true } });
  if (!user) throw httpError('用户不存在', 404);

  const official = input.channel === 'official';
  const key = official ? await ensureOfficialKey(input.userId) : null;
  const access = await prisma.agentRebateAccess.findUnique({ where: { agentId: agent.id } });
  const enrollment = await prisma.rebateEnrollment.findUnique({ where: { expertId: agent.authorId } });
  const qualified =
    official &&
    access?.status === 'active' &&
    access.qualifiedAt &&
    input.occurredAt.getTime() >= access.qualifiedAt.getTime() &&
    enrollment?.status !== 'paused';

  let rateBps = 0;
  if (qualified) {
    const rates = await prisma.rebateRate.findMany({
      where: { modelId: input.modelId, effectiveFrom: { lte: input.occurredAt } }
    });
    const hit = resolveRebateRate(rates as RebateRateRow[], {
      agentId: agent.id,
      expertId: agent.authorId,
      modelId: input.modelId,
      at: input.occurredAt
    });
    rateBps = hit?.rateBps || 0;
  }
  const amountCents = official ? Math.max(0, Math.round(input.amountCents)) : 0;
  const rebateCents = qualified ? rebateCentsFrom(amountCents, rateBps) : 0;

  try {
    return await prisma.modelUsage.create({
      data: {
        id: newId('usage'),
        idempotencyKey: input.idempotencyKey,
        userId: user.id,
        userName: user.name,
        officialKeyId: key?.id || '',
        agentId: agent.id,
        expertId: agent.authorId,
        modelId: input.modelId,
        channel: official ? 'official' : 'self',
        occurredAt: input.occurredAt,
        tokens: Math.max(0, Math.round(input.tokens)),
        amountCents,
        eligible: Boolean(qualified) && rebateCents >= 0 && rateBps > 0,
        rateBps,
        rebateCents: rateBps > 0 ? rebateCents : 0
      }
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'P2002') throw error;
    const raced = await prisma.modelUsage.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (!raced) throw error;
    return raced;
  }
}

function inRange(date: Date, from?: Date, to?: Date) {
  if (from && date.getTime() < from.getTime()) return false;
  if (to && date.getTime() > to.getTime()) return false;
  return true;
}

export async function listUsageSummary(input: {
  expertId: string;
  agentId?: string;
  channel?: string;
  from?: Date;
  to?: Date;
}) {
  const rows = await prisma.modelUsage.findMany({
    where: {
      expertId: input.expertId,
      ...(input.agentId ? { agentId: input.agentId } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.from || input.to
        ? {
            occurredAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {})
            }
          }
        : {})
    },
    orderBy: { occurredAt: 'desc' }
  });
  const agents = await prisma.agent.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.agentId))] } },
    select: { id: true, title: true }
  });
  const titles = new Map(agents.map((row) => [row.id, row.title]));
  const grouped = new Map<string, {
    userId: string;
    userName: string;
    agentId: string;
    agentTitle: string;
    modelId: string;
    channel: string;
    lastUsedAt: string;
    runCount: number;
    tokens: number;
    amountCents: number;
    rebateCents: number;
  }>();
  for (const row of rows) {
    const key = `${row.userId}|${row.agentId}|${row.modelId}|${row.channel}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        userId: row.userId,
        userName: row.userName,
        agentId: row.agentId,
        agentTitle: titles.get(row.agentId) || row.agentId,
        modelId: row.modelId,
        channel: row.channel,
        lastUsedAt: row.occurredAt.toISOString(),
        runCount: 1,
        tokens: row.tokens,
        amountCents: row.amountCents,
        rebateCents: row.rebateCents
      });
      continue;
    }
    current.runCount += 1;
    current.tokens += row.tokens;
    current.amountCents += row.amountCents;
    current.rebateCents += row.rebateCents;
    if (row.occurredAt.toISOString() > current.lastUsedAt) current.lastUsedAt = row.occurredAt.toISOString();
  }
  return [...grouped.values()];
}

export async function rebateIncome(expertId: string, from?: Date, to?: Date) {
  const [usages, adjustments, settlements] = await Promise.all([
    prisma.modelUsage.findMany({ where: { expertId, eligible: true } }),
    prisma.rebateAdjustment.findMany({ where: { expertId }, orderBy: { createdAt: 'desc' } }),
    prisma.rebateSettlement.findMany({ where: { expertId }, orderBy: { period: 'desc' } })
  ]);
  const settledPeriods = new Set(settlements.map((row) => row.period));
  const monthKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
  };
  const currentPeriod = monthKey(new Date());
  let currentCents = 0;
  let pendingCents = 0;
  for (const row of usages) {
    const period = monthKey(row.occurredAt);
    if (period === currentPeriod) currentCents += row.rebateCents;
    else if (!settledPeriods.has(period)) pendingCents += row.rebateCents;
  }
  for (const row of adjustments) {
    const period = monthKey(row.createdAt);
    const milli = row.amountCents * 10;
    if (period === currentPeriod) currentCents += milli;
    else if (!settledPeriods.has(period)) pendingCents += milli;
  }
  const settledCents = settlements.reduce((sum, row) => sum + row.amountCents, 0);
  const agents = await prisma.agent.findMany({
    where: { authorId: expertId },
    select: { id: true, title: true }
  });
  const titles = new Map(agents.map((row) => [row.id, row.title]));
  const detailMap = new Map<string, {
    day: string;
    userId: string;
    userName: string;
    agentId: string;
    agentTitle: string;
    modelId: string;
    amountCents: number;
    rateBps: number;
    rebateCents: number;
  }>();
  const dayKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };
  for (const row of usages) {
    if (!inRange(row.occurredAt, from, to)) continue;
    const day = dayKey(row.occurredAt);
    const key = `${day}|${row.userId}|${row.agentId}|${row.modelId}|${row.rateBps}`;
    const current = detailMap.get(key);
    if (!current) {
      detailMap.set(key, {
        day,
        userId: row.userId,
        userName: row.userName,
        agentId: row.agentId,
        agentTitle: titles.get(row.agentId) || row.agentId,
        modelId: row.modelId,
        amountCents: row.amountCents,
        rateBps: row.rateBps,
        rebateCents: row.rebateCents
      });
      continue;
    }
    current.amountCents += row.amountCents;
    current.rebateCents += row.rebateCents;
  }
  return {
    totalCents: currentCents + pendingCents + settledCents,
    currentCents,
    pendingCents,
    settledCents,
    currentPeriod,
    details: [...detailMap.values()].sort((a, b) => b.day.localeCompare(a.day) || a.userName.localeCompare(b.userName, 'zh-CN')),
    adjustments: adjustments.map((row) => ({
      id: row.id,
      usageId: row.usageId,
      amountCents: row.amountCents,
      reason: row.reason,
      createdAt: row.createdAt.toISOString()
    })),
    settlements: settlements.map((row) => ({
      id: row.id,
      period: row.period,
      amountCents: row.amountCents,
      note: row.note,
      createdAt: row.createdAt.toISOString()
    }))
  };
}

export async function listRebateAdmin() {
  const [enrollments, accesses, rates, usages, settlements] = await Promise.all([
    prisma.rebateEnrollment.findMany({ include: { expert: { select: { id: true, name: true } } } }),
    prisma.agentRebateAccess.findMany({
      include: { agent: { select: { id: true, title: true } } }
    }),
    prisma.rebateRate.findMany({ orderBy: { effectiveFrom: 'desc' }, take: 100 }),
    prisma.modelUsage.findMany({
      where: { eligible: true, channel: 'official' },
      orderBy: { occurredAt: 'desc' }
    }),
    prisma.rebateSettlement.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  ]);
  const agentTitles = new Map(
    (await prisma.agent.findMany({
      where: { id: { in: [...new Set(usages.map((row) => row.agentId))] } },
      select: { id: true, title: true }
    })).map((row) => [row.id, row.title])
  );
  const experts = await prisma.expert.findMany({
    where: { id: { in: [...new Set(usages.map((row) => row.expertId))] } },
    select: { id: true, name: true, user: { select: { phone: true } } }
  });
  const expertNames = new Map(experts.map((row) => [row.id, row.name]));
  const expertPhones = new Map(experts.map((row) => [row.id, row.user?.phone || '']));
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(usages.map((row) => row.userId))] } },
    select: { id: true, name: true, phone: true }
  });
  const userNames = new Map(users.map((row) => [row.id, row.name]));
  const userPhones = new Map(users.map((row) => [row.id, row.phone || '']));
  const dayKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const grouped = new Map<string, {
    day: string;
    userId: string;
    userName: string;
    userPhone: string;
    expertId: string;
    expertName: string;
    expertPhone: string;
    agentId: string;
    agentTitle: string;
    modelId: string;
    rateBps: number;
    amountCents: number;
    rebateCents: number;
  }>();
  for (const row of usages) {
    const day = dayKey(row.occurredAt);
    const key = `${day}|${row.userId}|${row.expertId}|${row.agentId}|${row.modelId}|${row.rateBps}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        day,
        userId: row.userId,
        userName: userNames.get(row.userId) || row.userName || row.userId,
        userPhone: userPhones.get(row.userId) || '',
        expertId: row.expertId,
        expertName: expertNames.get(row.expertId) || row.expertId,
        expertPhone: expertPhones.get(row.expertId) || '',
        agentId: row.agentId,
        agentTitle: agentTitles.get(row.agentId) || row.agentId,
        modelId: row.modelId,
        rateBps: row.rateBps,
        amountCents: row.amountCents,
        rebateCents: row.rebateCents
      });
      continue;
    }
    current.amountCents += row.amountCents;
    current.rebateCents += row.rebateCents;
  }
  return {
    enrollments,
    accesses,
    rates,
    settlements,
    usages: [...grouped.values()].sort((a, b) => b.day.localeCompare(a.day) || a.userName.localeCompare(b.userName, 'zh-CN') || a.agentTitle.localeCompare(b.agentTitle, 'zh-CN'))
  };
}

export async function setAgentRebateStatus(agentId: string, status: 'active' | 'paused' | 'passed') {
  const access = await prisma.agentRebateAccess.findUnique({ where: { agentId } });
  if (!access) throw httpError('该智能体尚未接入检查', 404);
  return prisma.agentRebateAccess.update({
    where: { agentId },
    data: {
      status,
      qualifiedAt: status === 'active' ? access.qualifiedAt || new Date() : access.qualifiedAt
    }
  });
}

export async function setEnrollmentStatus(expertId: string, status: 'paused' | 'spec_downloaded' | 'enrolled') {
  const enrollment = await prisma.rebateEnrollment.findUnique({ where: { expertId } });
  if (!enrollment) throw httpError('该 FDE 尚未报名', 404);
  return prisma.rebateEnrollment.update({ where: { expertId }, data: { status } });
}

export async function createRebateRate(input: {
  scope: 'platform' | 'expert' | 'agent';
  expertId?: string;
  agentId?: string;
  modelId: string;
  rateBps: number;
  effectiveFrom: Date;
}) {
  if (input.rateBps < 0 || input.rateBps > 10000) throw httpError('比例须在 0% 到 100% 之间', 400);
  if (input.scope === 'expert' && !input.expertId) throw httpError('请填写 FDE', 400);
  if (input.scope === 'agent' && !input.agentId) throw httpError('请填写智能体', 400);
  const active = await prisma.rebateRate.findFirst({
    where: { modelId: input.modelId.trim(), status: 'active' }
  });
  if (active) throw httpError('该模型已设置返点', 400);
  return prisma.rebateRate.create({
    data: {
      id: newId('rate'),
      scope: input.scope,
      expertId: input.scope === 'expert' ? input.expertId || '' : input.scope === 'agent' ? '' : '',
      agentId: input.scope === 'agent' ? input.agentId || '' : '',
      modelId: input.modelId.trim(),
      rateBps: Math.round(input.rateBps),
      effectiveFrom: input.effectiveFrom
    }
  });
}

export async function updateRebateRate(id: string, input: { rateBps: number; effectiveFrom: Date }) {
  if (input.rateBps < 0 || input.rateBps > 10000) throw httpError('比例须在 0% 到 100% 之间', 400);
  const row = await prisma.rebateRate.findUnique({ where: { id } });
  if (!row) throw httpError('找不到这条返点设置', 404);
  return prisma.rebateRate.update({
    where: { id },
    data: { rateBps: Math.round(input.rateBps), effectiveFrom: input.effectiveFrom }
  });
}

export async function setRebateRateStatus(id: string, status: 'active' | 'paused') {
  const row = await prisma.rebateRate.findUnique({ where: { id } });
  if (!row) throw httpError('找不到这条返点设置', 404);
  if (status === 'active') {
    const other = await prisma.rebateRate.findFirst({
      where: { modelId: row.modelId, status: 'active', id: { not: id } }
    });
    if (other) throw httpError('该模型已有生效中的返点', 400);
  }
  return prisma.rebateRate.update({ where: { id }, data: { status } });
}

export async function addRebateAdjustment(input: {
  expertId: string;
  usageId?: string;
  amountCents: number;
  reason: string;
}) {
  if (!input.reason.trim()) throw httpError('请填写调整原因', 400);
  return prisma.rebateAdjustment.create({
    data: {
      id: newId('radj'),
      expertId: input.expertId,
      usageId: input.usageId || '',
      amountCents: Math.round(input.amountCents),
      reason: input.reason.trim()
    }
  });
}

export async function settleRebatePeriod(expertId: string, period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) throw httpError('结算周期格式应为 YYYY-MM', 400);
  const existing = await prisma.rebateSettlement.findUnique({
    where: { expertId_period: { expertId, period } }
  });
  if (existing) return existing;
  const [year, month] = period.split('-').map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  const usages = await prisma.modelUsage.findMany({
    where: { expertId, eligible: true, occurredAt: { gte: from, lt: to } }
  });
  const adjustments = await prisma.rebateAdjustment.findMany({
    where: { expertId, createdAt: { gte: from, lt: to } }
  });
  const amountCents =
    usages.reduce((sum, row) => sum + row.rebateCents, 0) +
    adjustments.reduce((sum, row) => sum + row.amountCents, 0);
  return prisma.rebateSettlement.create({
    data: {
      id: newId('rset'),
      expertId,
      period,
      amountCents,
      note: '按月结算'
    }
  });
}

export async function ensureRebateDemo() {
  await ensureRebateDefaults();
  const expert = await prisma.expert.findUnique({ where: { id: 'fde-linran' } });
  if (!expert?.userId) return;
  const enrolled = await prisma.rebateEnrollment.findUnique({ where: { expertId: expert.id } });
  if (!enrolled) {
    await prisma.rebateEnrollment.create({
      data: {
        id: 'rebate_demo_linran',
        expertId: expert.id,
        userId: expert.userId,
        status: 'spec_downloaded',
        specDownloadedAt: new Date('2026-10-01T00:00:00.000Z')
      }
    });
  }
  const agent = await prisma.agent.findFirst({ where: { id: 'doc-emergency', authorId: expert.id } });
  if (!agent) return;
  await prisma.agentRebateAccess.upsert({
    where: { agentId: agent.id },
    create: {
      id: 'raccess_demo_doc',
      agentId: agent.id,
      expertId: expert.id,
      status: 'active',
      checkedAt: new Date('2026-10-01T00:00:00.000Z'),
      qualifiedAt: new Date('2026-10-01T00:00:00.000Z')
    },
    update: {}
  });
  const agentRate = await prisma.rebateRate.findFirst({
    where: { scope: 'agent', agentId: agent.id, modelId: 'hellome-pro' }
  });
  if (!agentRate) {
    await prisma.rebateRate.create({
      data: {
        id: 'rate_demo_doc',
        scope: 'agent',
        agentId: agent.id,
        modelId: 'hellome-pro',
        rateBps: 1500,
        effectiveFrom: new Date('2026-10-01T00:00:00.000Z')
      }
    });
  }
  await recordModelUsage({
    idempotencyKey: 'demo_official_doc_1',
    userId: 'user-demo',
    agentId: agent.id,
    modelId: 'hellome-pro',
    channel: 'official',
    tokens: 8200,
    amountCents: 2000,
    occurredAt: new Date('2026-10-03T08:00:00.000Z')
  });
  await seedRebateHistory(expert.id);
}

const HISTORY_AGENTS = ['doc-emergency', 'job-seek-assistant', 'ecommerce-ai-cs'] as const;
const HISTORY_USERS = [
  ['mock-buyer-wang', '王经理', '13810001001'],
  ['mock-buyer-zhang', '张总', '13810001002'],
  ['mock-buyer-li', '李工', '13810001003'],
  ['mock-buyer-chen', '陈晓', '13810001004'],
  ['mock-buyer-zhao', '赵敏', '13810001005'],
  ['mock-buyer-liu', '刘洋', '13810001006'],
  ['user-demo', '演示用户', '13900001111'],
  ['mock-buyer-wu', '吴倩', '13810001008']
] as const;
const HISTORY_MODELS = ['hellome-pro', 'hellome-fast'] as const;

async function seedRebateHistory(expertId: string) {
  for (const [id, name, phone] of HISTORY_USERS) {
    await prisma.user.upsert({
      where: { id },
      update: { phone },
      create: {
        id,
        email: `${id}@buyers.hellome.art`,
        passwordHash: 'mock',
        name,
        role: 'normal',
        phone
      }
    });
  }
  const existingKeys = new Set(
    (await prisma.modelUsage.findMany({
      where: { idempotencyKey: { startsWith: 'mock_hist_' } },
      select: { idempotencyKey: true }
    })).map((row) => row.idempotencyKey)
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows: Array<{
    id: string;
    idempotencyKey: string;
    userId: string;
    userName: string;
    agentId: string;
    expertId: string;
    modelId: string;
    channel: string;
    occurredAt: Date;
    tokens: number;
    amountCents: number;
    eligible: boolean;
    rateBps: number;
    rebateCents: number;
  }> = [];
  for (let daysAgo = 1; daysAgo <= 21; daysAgo += 1) {
    const occurredAt = new Date(today);
    occurredAt.setDate(today.getDate() - daysAgo);
    occurredAt.setHours(11, 20, 0, 0);
    const day = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, '0')}-${String(occurredAt.getDate()).padStart(2, '0')}`;
    HISTORY_USERS.forEach(([userId, userName], userIndex) => {
      HISTORY_AGENTS.forEach((agentId, agentIndex) => {
        HISTORY_MODELS.forEach((modelId, modelIndex) => {
          const amountCents = 600 + ((daysAgo * 47 + userIndex * 130 + agentIndex * 90 + modelIndex * 70) % 5400);
          const rateBps = agentId === 'doc-emergency' && modelId === 'hellome-pro' ? 1500 : modelId === 'hellome-fast' ? 800 : 1000;
          const idempotencyKey = `mock_hist_${day}_${userId}_${agentId}_${modelId}`;
          if (existingKeys.has(idempotencyKey)) return;
          rows.push({
            id: `usage_mock_${day}_${userIndex}_${agentIndex}_${modelIndex}`,
            idempotencyKey,
            userId,
            userName,
            agentId,
            expertId,
            modelId,
            channel: 'official',
            occurredAt,
            tokens: 1000 + (amountCents % 9000),
            amountCents,
            eligible: true,
            rateBps,
            rebateCents: rebateCentsFrom(amountCents, rateBps)
          });
        });
      });
    });
  }
  if (rows.length > 0) await prisma.modelUsage.createMany({ data: rows });
}

export async function ensureRebateDefaults() {
  const existing = await prisma.rebateRate.findFirst({ where: { scope: 'platform', modelId: 'hellome-pro' } });
  if (existing) return;
  const from = new Date('2026-01-01T00:00:00.000Z');
  await prisma.rebateRate.createMany({
    data: [
      { id: newId('rate'), scope: 'platform', modelId: 'hellome-pro', rateBps: 1000, effectiveFrom: from },
      { id: newId('rate'), scope: 'platform', modelId: 'hellome-fast', rateBps: 800, effectiveFrom: from }
    ]
  });
}
