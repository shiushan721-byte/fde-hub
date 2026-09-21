import { prisma } from '../lib/prisma';
import { parseJson } from '../lib/json';
import { DEMO_CREATOR_PHONES } from '../../shared/creatorContact';
import {
  customProjectCreatedAtMs,
  normalizeCustomProjects,
  type OfficialProductTemplate
} from '../../shared/customProjects';
import { DEFAULT_OFFICIAL_PRODUCTS, RETIRED_OFFICIAL_PRODUCT_IDS } from '../../shared/officialProductCatalog';

function newOfficialProductId() {
  return `oprod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toTemplate(row: {
  id: string;
  title: string;
  description: string;
  suggestedPrice: number;
  sortOrder: number;
}): OfficialProductTemplate {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    suggestedPrice: row.suggestedPrice,
    sortOrder: row.sortOrder
  };
}

export async function ensureOfficialProducts() {
  for (const [index, item] of DEFAULT_OFFICIAL_PRODUCTS.entries()) {
    await prisma.officialProduct.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title,
        description: item.description,
        suggestedPrice: item.suggestedPrice,
        sortOrder: index + 1,
        status: 'active'
      },
      update: {
        title: item.title,
        description: item.description,
        suggestedPrice: item.suggestedPrice,
        sortOrder: index + 1,
        status: 'active'
      }
    });
  }
  if (RETIRED_OFFICIAL_PRODUCT_IDS.length) {
    await prisma.officialProduct.updateMany({
      where: { id: { in: RETIRED_OFFICIAL_PRODUCT_IDS } },
      data: { status: 'offline' }
    });
  }
}

export async function listOfficialProducts(input?: { status?: 'active' | 'offline' | 'all' }) {
  await ensureOfficialProducts();
  const status = input?.status || 'all';
  return prisma.officialProduct.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  });
}

export async function listActiveOfficialTemplates(): Promise<OfficialProductTemplate[]> {
  const rows = await listOfficialProducts({ status: 'active' });
  return rows.map(toTemplate);
}

export async function createOfficialProduct(input: {
  title: string;
  description?: string;
  suggestedPrice?: number;
  sortOrder?: number;
}) {
  const title = input.title.trim();
  if (!title) throw new Error('请填写商品名称');
  const suggestedPrice = Math.max(0, Math.round(Number(input.suggestedPrice) || 0));
  const max = await prisma.officialProduct.aggregate({ _max: { sortOrder: true } });
  return prisma.officialProduct.create({
    data: {
      id: newOfficialProductId(),
      title,
      description: (input.description || '').trim(),
      suggestedPrice,
      sortOrder: input.sortOrder ?? (max._max.sortOrder || 0) + 1,
      status: 'active'
    }
  });
}

export async function updateOfficialProduct(
  id: string,
  input: {
    title?: string;
    description?: string;
    suggestedPrice?: number;
    sortOrder?: number;
    status?: 'active' | 'offline';
  }
) {
  const row = await prisma.officialProduct.findUnique({ where: { id } });
  if (!row) throw new Error('官方商品不存在');
  const data: {
    title?: string;
    description?: string;
    suggestedPrice?: number;
    sortOrder?: number;
    status?: string;
  } = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('请填写商品名称');
    data.title = title;
  }
  if (input.description !== undefined) data.description = input.description.trim();
  if (input.suggestedPrice !== undefined) {
    data.suggestedPrice = Math.max(0, Math.round(Number(input.suggestedPrice) || 0));
  }
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.status) data.status = input.status;
  return prisma.officialProduct.update({ where: { id }, data });
}

export async function computeOmittedOfficialIds(projects: { officialProductId?: string }[]) {
  const official = await listOfficialProducts({ status: 'active' });
  const kept = new Set(
    projects.map((item) => item.officialProductId).filter((id): id is string => Boolean(id))
  );
  return official.map((item) => item.id).filter((id) => !kept.has(id));
}

export async function listCustomProductsFromAgents() {
  const agents = await prisma.agent.findMany({
    where: { creatorDeletedAt: null },
    select: {
      id: true,
      title: true,
      authorId: true,
      authorName: true,
      customProjects: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const authorIds = [...new Set(agents.map((agent) => agent.authorId).filter((id): id is string => Boolean(id)))];
  const [experts, users] = await Promise.all([
    authorIds.length
      ? prisma.expert.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, socialLinks: true, user: { select: { phone: true } } }
        })
      : Promise.resolve([]),
    authorIds.length
      ? prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, phone: true }
        })
      : Promise.resolve([])
  ]);
  const expertById = new Map(experts.map((row) => [row.id, row]));
  const userById = new Map(users.map((row) => [row.id, row]));

  const creatorPhone = (authorId: string) => {
    const userPhone = userById.get(authorId)?.phone?.trim();
    if (userPhone) return userPhone;
    const expert = expertById.get(authorId);
    const expertPhone = expert?.user?.phone?.trim();
    if (expertPhone) return expertPhone;
    const links = parseJson<{ phone?: string }>(expert?.socialLinks, {});
    if (links.phone?.trim()) return links.phone.trim();
    return DEMO_CREATOR_PHONES[authorId] || '';
  };

  const items: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    source: 'official' | 'custom';
    agentId: string;
    agentTitle: string;
    creatorId: string;
    creatorName: string;
    creatorPhone: string;
    createdAt: string | null;
  }> = [];

  for (const agent of agents) {
    const projects = normalizeCustomProjects(parseJson(agent.customProjects, []));
    for (const project of projects) {
      const source = project.source === 'official' || project.officialProductId ? 'official' : 'custom';
      const createdMs =
        customProjectCreatedAtMs(project.id, project.createdAt) || agent.updatedAt.getTime();
      items.push({
        id: `${agent.id}:${project.id}`,
        title: project.title,
        description: project.description || '',
        price: project.price,
        source,
        agentId: agent.id,
        agentTitle: agent.title,
        creatorId: agent.authorId || '',
        creatorName: agent.authorName || '未知创作者',
        creatorPhone: agent.authorId ? creatorPhone(agent.authorId) : '',
        createdAt: createdMs > 0 ? new Date(createdMs).toISOString() : null
      });
    }
  }

  return items.sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });
}
