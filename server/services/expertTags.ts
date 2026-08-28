import { prisma } from '../lib/prisma';
import { parseJson, toJson } from '../lib/json';

const DEFAULT_TAG_NAMES = [
  '电商零售',
  '智能制造',
  '内容营销',
  '法律金融',
  '医疗健康',
  '知识库检索',
  '办公协同',
  '私有化部署',
  '电商客服',
  '知识库构建',
  '工作流自动化',
  '营销获客',
  '本地生活',
  '财报结构化',
  '智能风控'
];

function newTagId() {
  return `etag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseExpertDomainTags(raw: string) {
  return parseJson<string[]>(raw || '[]', []);
}

export async function ensureExpertTags() {
  const existing = await prisma.expertTag.count();
  if (existing > 0) return;

  const names = [...new Set(DEFAULT_TAG_NAMES)];
  await prisma.expertTag.createMany({
    data: names.map((name, index) => ({
      id: `etag_seed_${index + 1}`,
      name,
      sortOrder: index + 1,
      status: 'active'
    }))
  });
}

export async function listExpertTags(input?: { status?: 'active' | 'offline' | 'all' }) {
  await ensureExpertTags();
  const status = input?.status || 'all';
  return prisma.expertTag.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });
}

export async function getActiveExpertTagNameSet() {
  const tags = await listExpertTags({ status: 'active' });
  return new Set(tags.map((t) => t.name));
}

export function filterActiveDomainTags(tags: string[], activeNames: Set<string>) {
  return tags.filter((t) => activeNames.has(t));
}

export function buildExpertCountByTagName(
  experts: Array<{ domainTags: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const expert of experts) {
    for (const tag of parseExpertDomainTags(expert.domainTags)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

export async function countExpertsByTagName() {
  const experts = await prisma.expert.findMany({ select: { domainTags: true } });
  return buildExpertCountByTagName(experts);
}

export async function countExpertsUsingTag(tagName: string) {
  const counts = await countExpertsByTagName();
  return counts.get(tagName) || 0;
}

export async function listExpertsUsingTag(tagName: string) {
  const experts = await prisma.expert.findMany({
    select: { id: true, name: true, expertNo: true, domainTags: true },
    orderBy: [{ expertNo: 'asc' }, { name: 'asc' }]
  });
  return experts
    .filter((e) => parseExpertDomainTags(e.domainTags).includes(tagName))
    .map((e) => ({
      id: e.id,
      name: e.name,
      expertNo: e.expertNo,
      domainTags: parseExpertDomainTags(e.domainTags)
    }));
}

async function replaceTagOnExperts(fromName: string, toName: string) {
  const experts = await prisma.expert.findMany({
    select: { id: true, domainTags: true, pendingProfileSnapshot: true, skills: true, roleTag: true }
  });

  for (const expert of experts) {
    const tags = parseExpertDomainTags(expert.domainTags);
    if (!tags.includes(fromName)) continue;

    const nextTags = [...new Set(tags.map((t) => (t === fromName ? toName : t)))];
    const skills = parseJson<string[]>(expert.skills, []);
    const nextSkills = skills.map((s) => (s === fromName ? toName : s));

    let pendingPatch: Record<string, unknown> | null = null;
    if (expert.pendingProfileSnapshot?.trim()) {
      const pending = parseJson<Record<string, unknown>>(expert.pendingProfileSnapshot, {});
      const pendingTags = Array.isArray(pending.domainTags)
        ? pending.domainTags.map(String)
        : [];
      if (pendingTags.includes(fromName)) {
        pendingPatch = {
          ...pending,
          domainTags: [...new Set(pendingTags.map((t) => (t === fromName ? toName : t)))]
        };
      }
    }

    await prisma.expert.update({
      where: { id: expert.id },
      data: {
        domainTags: toJson(nextTags),
        skills: toJson(nextSkills),
        roleTag: expert.roleTag === `${fromName} 专家` ? `${toName} 专家` : expert.roleTag,
        ...(pendingPatch ? { pendingProfileSnapshot: toJson(pendingPatch) } : {})
      }
    });
  }

  const apps = await prisma.expertApplication.findMany({
    select: { id: true, submittedProfileSnapshot: true }
  });
  for (const app of apps) {
    const snap = parseJson<Record<string, unknown>>(app.submittedProfileSnapshot, {});
    const tags = Array.isArray(snap.domainTags) ? snap.domainTags.map(String) : [];
    if (!tags.includes(fromName)) continue;
    snap.domainTags = [...new Set(tags.map((t) => (t === fromName ? toName : t)))];
    await prisma.expertApplication.update({
      where: { id: app.id },
      data: { submittedProfileSnapshot: toJson(snap) }
    });
  }
}

export async function validateActiveDomainTags(tagNames: string[]) {
  const unique = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
  if (unique.length === 0) throw new Error('请至少选择一个专家标签');
  const active = await getActiveExpertTagNameSet();
  const invalid = unique.filter((t) => !active.has(t));
  if (invalid.length > 0) {
    throw new Error(`以下标签未上架或不存在：${invalid.join('、')}`);
  }
  return unique;
}

export async function createExpertTag(input: { name: string; sortOrder?: number }) {
  const name = input.name.trim();
  if (!name) throw new Error('标签名称不能为空');
  await ensureExpertTags();
  const dup = await prisma.expertTag.findUnique({ where: { name } });
  if (dup) throw new Error('标签名称已存在');

  const max = await prisma.expertTag.aggregate({ _max: { sortOrder: true } });
  return prisma.expertTag.create({
    data: {
      id: newTagId(),
      name,
      sortOrder: input.sortOrder ?? (max._max.sortOrder || 0) + 1,
      status: 'active'
    }
  });
}

export async function updateExpertTag(
  id: string,
  input: { name?: string; sortOrder?: number; status?: 'active' | 'offline' }
) {
  const tag = await prisma.expertTag.findUnique({ where: { id } });
  if (!tag) throw new Error('标签不存在');

  const data: { name?: string; sortOrder?: number; status?: string } = {};
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.status) data.status = input.status;

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error('标签名称不能为空');
    if (name !== tag.name) {
      const dup = await prisma.expertTag.findUnique({ where: { name } });
      if (dup) throw new Error('标签名称已存在');
      await replaceTagOnExperts(tag.name, name);
      data.name = name;
    }
  }

  return prisma.expertTag.update({ where: { id }, data });
}

export async function offlineExpertTag(id: string) {
  const tag = await prisma.expertTag.findUnique({ where: { id } });
  if (!tag) throw new Error('标签不存在');
  if (tag.status === 'offline') throw new Error('标签已下架');

  const usage = await countExpertsUsingTag(tag.name);
  if (usage > 0) {
    throw new Error(
      `仍有 ${usage} 位专家使用该标签，请先在下方逐位调整专家标签，全部迁出后再下架`
    );
  }

  return prisma.expertTag.update({
    where: { id: tag.id },
    data: { status: 'offline' }
  });
}

export async function onlineExpertTag(id: string) {
  const tag = await prisma.expertTag.findUnique({ where: { id } });
  if (!tag) throw new Error('标签不存在');
  return prisma.expertTag.update({
    where: { id },
    data: { status: 'active' }
  });
}
