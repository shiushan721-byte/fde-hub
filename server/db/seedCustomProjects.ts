import { prisma } from '../lib/prisma';
import { toJson, parseJson } from '../lib/json';
import { normalizeCustomProjects } from '../../shared/customProjects';

const SAMPLE_CUSTOM_PROJECTS: Record<string, unknown[]> = {
  'ecommerce-ai-cs': [
    {
      id: 'cprj_ecom_flow',
      title: '流程修改、界面调整',
      description: '按店铺售后路径改工单分流、回复话术和客服工作台。',
      price: 200,
      active: true,
      sortOrder: 0
    },
    {
      id: 'cprj_ecom_feishu',
      title: '同步到飞书文档',
      description: '售后记录与质检结果同步到飞书文档/多维表格。',
      price: 100,
      active: true,
      sortOrder: 1
    }
  ],
  'hz-canvas': [
    {
      id: 'cprj_hz_flow',
      title: '流程修改、界面调整',
      description: '按你的业务路径改提示词、SOP 和关键界面。',
      price: 200,
      active: true,
      sortOrder: 0
    },
    {
      id: 'cprj_hz_feishu',
      title: '同步到飞书文档',
      description: '把画布产出同步到指定飞书知识库/文档。',
      price: 100,
      active: true,
      sortOrder: 1
    }
  ]
};

export async function ensureSampleCustomProjects() {
  for (const [agentId, projects] of Object.entries(SAMPLE_CUSTOM_PROJECTS)) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) continue;
    const existing = normalizeCustomProjects(parseJson(agent.customProjects, []));
    if (existing.length) continue;
    await prisma.agent.update({
      where: { id: agentId },
      data: { customProjects: toJson(projects), canFDECustom: true }
    });
  }
}

export async function ensureAdapterPackagePricing() {
  const agent = await prisma.agent.findUnique({ where: { id: 'hz-canvas' } });
  if (!agent) return;
  const raw = parseJson<Array<Record<string, unknown>>>(agent.adapterPackages, []);
  if (!Array.isArray(raw) || !raw.length) return;
  let changed = false;
  const next = raw.map((row) => {
    if (row.id === 'adp_hz_workbuddy' && row.isFree == null && row.price == null) {
      changed = true;
      return { ...row, isFree: false, price: 29 };
    }
    if (row.isFree == null && row.price == null) {
      changed = true;
      return { ...row, isFree: true, price: 0 };
    }
    return row;
  });
  if (!changed) return;
  await prisma.agent.update({
    where: { id: 'hz-canvas' },
    data: { adapterPackages: toJson(next) }
  });
}
