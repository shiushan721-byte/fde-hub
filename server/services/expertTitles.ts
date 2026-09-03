import { prisma } from '../lib/prisma';
import { parseJson, toJson } from '../lib/json';

export const DEFAULT_EXPERT_TITLES = [
  '电商 AI 解决方案架构师',
  '制造业 & 工业视觉AI团队负责人',
  '内容增长 & 全域营销智能体专家',
  '金融合规与研报深度解析架构师',
  '法务科技与政企协同 AI 架构师',
  '医疗健康与就医导诊智能体架构师',
  '企业流程自动化与智能体方案顾问'
];

function newTitleId() {
  return `etit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensureExpertTitles() {
  const existing = await prisma.expertTitle.findMany({ select: { name: true } });
  const have = new Set(existing.map((t) => t.name));
  const usedTitles = await prisma.expert.findMany({
    select: { title: true }
  });
  const toCreate = [
    ...DEFAULT_EXPERT_TITLES,
    ...usedTitles.map((e) => e.title.trim()).filter(Boolean)
  ].filter((name, index, arr) => name && !have.has(name) && arr.indexOf(name) === index);

  if (toCreate.length === 0) return;

  const max = await prisma.expertTitle.aggregate({ _max: { sortOrder: true } });
  let sort = max._max.sortOrder || existing.length;
  await prisma.expertTitle.createMany({
    data: toCreate.map((name) => {
      sort += 1;
      return {
        id: `etit_seed_${sort}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        sortOrder: sort,
        status: 'active'
      };
    })
  });
}

export async function listExpertTitles(input?: { status?: 'active' | 'offline' | 'all' }) {
  await ensureExpertTitles();
  const status = input?.status || 'all';
  return prisma.expertTitle.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });
}

export async function getActiveExpertTitleNameSet() {
  const titles = await listExpertTitles({ status: 'active' });
  return new Set(titles.map((t) => t.name));
}

export async function countExpertsByTitleName() {
  const groups = await prisma.expert.groupBy({
    by: ['title'],
    _count: { _all: true }
  });
  return new Map(groups.map((g) => [g.title, g._count._all]));
}

export async function countExpertsUsingTitle(titleName: string) {
  return prisma.expert.count({ where: { title: titleName } });
}

export async function listExpertsUsingTitle(titleName: string) {
  const experts = await prisma.expert.findMany({
    where: { title: titleName },
    select: { id: true, name: true, expertNo: true, title: true },
    orderBy: [{ expertNo: 'asc' }, { name: 'asc' }]
  });
  return experts;
}

async function replaceTitleOnExperts(fromName: string, toName: string) {
  await prisma.expert.updateMany({
    where: { title: fromName },
    data: { title: toName }
  });

  const pending = await prisma.expert.findMany({
    where: { pendingProfileSnapshot: { not: '' } },
    select: { id: true, pendingProfileSnapshot: true }
  });
  for (const expert of pending) {
    const snap = parseJson<Record<string, unknown>>(expert.pendingProfileSnapshot, {});
    if (String(snap.title || '') !== fromName) continue;
    snap.title = toName;
    await prisma.expert.update({
      where: { id: expert.id },
      data: { pendingProfileSnapshot: toJson(snap) }
    });
  }

  const apps = await prisma.expertApplication.findMany({
    select: { id: true, submittedProfileSnapshot: true }
  });
  for (const app of apps) {
    const snap = parseJson<Record<string, unknown>>(app.submittedProfileSnapshot, {});
    if (String(snap.expertTitle || '') !== fromName) continue;
    snap.expertTitle = toName;
    await prisma.expertApplication.update({
      where: { id: app.id },
      data: { submittedProfileSnapshot: toJson(snap) }
    });
  }
}

export async function validateActiveExpertTitle(title: string) {
  const name = title.trim();
  if (!name) throw new Error('请选择专家头衔');
  const active = await getActiveExpertTitleNameSet();
  if (!active.has(name)) {
    throw new Error('该专家头衔未上架或不存在');
  }
  return name;
}

export async function createExpertTitle(input: { name: string; sortOrder?: number }) {
  const name = input.name.trim();
  if (!name) throw new Error('头衔名称不能为空');
  await ensureExpertTitles();
  const dup = await prisma.expertTitle.findUnique({ where: { name } });
  if (dup) throw new Error('头衔名称已存在');

  const max = await prisma.expertTitle.aggregate({ _max: { sortOrder: true } });
  return prisma.expertTitle.create({
    data: {
      id: newTitleId(),
      name,
      sortOrder: input.sortOrder ?? (max._max.sortOrder || 0) + 1,
      status: 'active'
    }
  });
}

export async function updateExpertTitle(
  id: string,
  input: { name?: string; sortOrder?: number; status?: 'active' | 'offline' }
) {
  const title = await prisma.expertTitle.findUnique({ where: { id } });
  if (!title) throw new Error('头衔不存在');

  const data: { name?: string; sortOrder?: number; status?: string } = {};
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.status) data.status = input.status;

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error('头衔名称不能为空');
    if (name !== title.name) {
      const dup = await prisma.expertTitle.findUnique({ where: { name } });
      if (dup) throw new Error('头衔名称已存在');
      await replaceTitleOnExperts(title.name, name);
      data.name = name;
    }
  }

  return prisma.expertTitle.update({ where: { id }, data });
}

export async function offlineExpertTitle(id: string) {
  const title = await prisma.expertTitle.findUnique({ where: { id } });
  if (!title) throw new Error('头衔不存在');
  if (title.status === 'offline') throw new Error('头衔已下架');

  const usage = await countExpertsUsingTitle(title.name);
  if (usage > 0) {
    throw new Error(
      `仍有 ${usage} 位专家使用该头衔，请先在下方逐位调整专家头衔，全部迁出后再下架`
    );
  }

  return prisma.expertTitle.update({
    where: { id: title.id },
    data: { status: 'offline' }
  });
}

export async function onlineExpertTitle(id: string) {
  const title = await prisma.expertTitle.findUnique({ where: { id } });
  if (!title) throw new Error('头衔不存在');
  return prisma.expertTitle.update({
    where: { id },
    data: { status: 'active' }
  });
}
