import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';

type ReviewAgentSeed = {
  id: string;
  title: string;
  desc: string;
  category: string;
  coverImage: string;
  gradient: string;
  tagColor: string;
  badge?: string;
  authorId: string;
  authorName: string;
  price: number;
  status: 'in_review' | 'offline';
  skillFileName: string;
  version: string;
  sortOrder: number;
};

const SAMPLE_REVIEW_AGENTS: ReviewAgentSeed[] = [
  {
    id: 'agent_review_xhs_copy',
    title: '小红书爆款文案生成器',
    desc: '基于品牌调性与历史爆款结构，一键生成标题、正文与话题标签；支持多账号语气切换与违禁词自检，适合内容团队批量产出。',
    category: '内容营销',
    coverImage:
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-rose-950 via-pink-900 to-slate-900',
    tagColor: 'rose',
    badge: '待审新品',
    authorId: 'fde-maya',
    authorName: '苏晴 (Maya)',
    price: 29,
    status: 'in_review',
    skillFileName: 'xhs-copywriter-skill.json',
    version: 'v1.0.0',
    sortOrder: 901
  },
  {
    id: 'agent_review_factory_qc',
    title: '工厂质检视觉助手',
    desc: '对接产线摄像头与 MES，自动识别划痕、缺件与色差，输出可追溯质检报告；支持边缘离线推理与告警推送。',
    category: '智能制造',
    coverImage:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-slate-900 via-cyan-950 to-slate-800',
    tagColor: 'cyan',
    authorId: 'fde-yunfan',
    authorName: '云帆科技',
    price: 199,
    status: 'in_review',
    skillFileName: 'factory-qc-vision-skill.json',
    version: 'v0.9.2',
    sortOrder: 902
  },
  {
    id: 'agent_review_private_reply',
    title: '私域社群自动回复',
    desc: '针对微信群/企微社群常见问题自动应答，支持知识库检索、转人工与意向线索打标；可与 CRM 同步客户标签。',
    category: '电商零售',
    coverImage:
      'https://images.unsplash.com/photo-1556745750-8d76bdb6984a?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-emerald-950 via-teal-900 to-slate-900',
    tagColor: 'emerald',
    badge: '企业版',
    authorId: 'fde-linran',
    authorName: '林然',
    price: 49,
    status: 'in_review',
    skillFileName: 'private-community-reply-skill.json',
    version: 'v1.1.0',
    sortOrder: 903
  },
  {
    id: 'agent_review_contract_risk',
    title: '合同条款风险扫描',
    desc: '上传合同 PDF/Word，自动标注付款、违约、知识产权与竞业限制等高风险条款，并给出修改建议与法规引用。',
    category: '法律金融',
    coverImage:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-indigo-950 via-slate-900 to-black',
    tagColor: 'indigo',
    authorId: 'fde-chenzimo',
    authorName: '陈子墨',
    price: 79,
    status: 'in_review',
    skillFileName: 'contract-risk-scan-skill.json',
    version: 'v2.0.0',
    sortOrder: 904
  },
  {
    id: 'agent_review_rejected_demo',
    title: '泛用聊天机器人（示例驳回）',
    desc: '功能描述过于宽泛，未提供可验证的 Skill 包与明确业务场景，仅供演示「已下架/驳回」筛选。',
    category: '办公协同',
    coverImage:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-slate-800 to-slate-900',
    tagColor: 'slate',
    authorId: 'fde-zhouchen',
    authorName: '周晨',
    price: 0,
    status: 'offline',
    skillFileName: 'generic-chatbot-skill.json',
    version: 'v0.1.0',
    sortOrder: 905
  }
];

function buildSolutionPayload(seed: ReviewAgentSeed) {
  return toJson({
    version: seed.version,
    skillFileName: seed.skillFileName,
    skillPackage: {
      version: seed.version,
      fileName: seed.skillFileName,
      runtime: 'hermes-sandbox',
      entry: 'main.workflow.json'
    },
    platformSupport: 'both',
    submitNote: '提交平台审核，等待运营分类上架。'
  });
}

/** 为「通用智能体审核」面板补齐待审/驳回样例（幂等） */
export async function ensureSampleInReviewAgents() {
  const existing = await prisma.agent.findMany({
    where: { id: { in: SAMPLE_REVIEW_AGENTS.map((a) => a.id) } },
    select: { id: true }
  });
  const existingIds = new Set(existing.map((a) => a.id));
  const missing = SAMPLE_REVIEW_AGENTS.filter((a) => !existingIds.has(a.id));
  if (missing.length === 0) return;

  const expertIds = new Set(
    (
      await prisma.expert.findMany({
        where: { id: { in: missing.map((a) => a.authorId) } },
        select: { id: true }
      })
    ).map((e) => e.id)
  );

  const rows = missing
    .filter((seed) => expertIds.has(seed.authorId))
    .map((seed) => ({
      id: seed.id,
      kind: 'catalog',
      title: seed.title,
      desc: seed.desc,
      category: seed.category,
      coverImage: seed.coverImage,
      gradient: seed.gradient,
      tagColor: seed.tagColor,
      badge: seed.badge ?? null,
      canFDECustom: true,
      authorId: seed.authorId,
      authorName: seed.authorName,
      price: seed.price,
      pricingPlans: toJson({
        monthlyPrice: seed.price,
        annualPrice: Math.max(seed.price * 10, 0),
        buyoutPrice: Math.max(seed.price * 20, 0),
        preferredPlan: 'monthly'
      }),
      likesCount: '0',
      favoritesCount: '0',
      commentsCount: '0',
      sharesCount: '0',
      usageCount: '0',
      rating: 5,
      status: seed.status,
      showOnHome: false,
      featured: false,
      sortOrder: seed.sortOrder,
      solutionPayload: buildSolutionPayload(seed)
    }));

  if (rows.length === 0) return;
  await prisma.agent.createMany({ data: rows });
}

type DeletedAgentSeed = Omit<ReviewAgentSeed, 'status'> & { deletedDaysAgo: number };

const SAMPLE_DELETED_AGENTS: DeletedAgentSeed[] = [
  {
    id: 'agent_deleted_travel_itinerary',
    title: '周末短途行程规划师',
    desc: '根据预算、同行人数与偏好生成 1–3 日行程，含交通、餐饮与避坑提示。创作者已从市场撤回并不再维护。',
    category: '生活服务',
    coverImage:
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-sky-950 via-cyan-900 to-slate-900',
    tagColor: 'sky',
    authorId: 'fde-linran',
    authorName: '林然',
    price: 19,
    skillFileName: 'weekend-trip-planner-skill.json',
    version: 'v1.2.0',
    sortOrder: 911,
    deletedDaysAgo: 5
  },
  {
    id: 'agent_deleted_resume_polish',
    title: '简历亮点改写助手',
    desc: '针对目标岗位改写经历描述与项目成果表述。创作者选择删除后已从市场下架。',
    category: '办公协同',
    coverImage:
      'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-amber-950 via-orange-900 to-slate-900',
    tagColor: 'amber',
    badge: '已下架',
    authorId: 'fde-maya',
    authorName: '苏晴 (Maya)',
    price: 9,
    skillFileName: 'resume-polish-skill.json',
    version: 'v1.0.3',
    sortOrder: 912,
    deletedDaysAgo: 12
  },
  {
    id: 'agent_deleted_shop_script',
    title: '直播话术节奏教练',
    desc: '按品类生成开场、促单与答疑话术节奏表。创作者删除后市场不可见，后台仍保留记录。',
    category: '电商零售',
    coverImage:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-rose-950 via-red-900 to-slate-900',
    tagColor: 'rose',
    authorId: 'fde-zhouchen',
    authorName: '周晨',
    price: 39,
    skillFileName: 'live-script-coach-skill.json',
    version: 'v0.8.0',
    sortOrder: 913,
    deletedDaysAgo: 2
  }
];

/** 为后台「创作者已删除」筛选补齐样例（幂等） */
export async function ensureSampleCreatorDeletedAgents() {
  const ids = SAMPLE_DELETED_AGENTS.map((a) => a.id);
  const existing = await prisma.agent.findMany({
    where: { id: { in: ids } },
    select: { id: true, creatorDeletedAt: true }
  });
  const existingById = new Map(existing.map((a) => [a.id, a]));

  const expertIds = new Set(
    (
      await prisma.expert.findMany({
        where: { id: { in: SAMPLE_DELETED_AGENTS.map((a) => a.authorId) } },
        select: { id: true }
      })
    ).map((e) => e.id)
  );

  const toCreate = SAMPLE_DELETED_AGENTS.filter(
    (seed) => expertIds.has(seed.authorId) && !existingById.has(seed.id)
  );
  const toMark = SAMPLE_DELETED_AGENTS.filter((seed) => {
    const row = existingById.get(seed.id);
    return Boolean(row && !row.creatorDeletedAt);
  });

  if (toCreate.length > 0) {
    await prisma.agent.createMany({
      data: toCreate.map((seed) => {
        const deletedAt = new Date(Date.now() - seed.deletedDaysAgo * 24 * 60 * 60 * 1000);
        return {
          id: seed.id,
          kind: 'catalog',
          title: seed.title,
          desc: seed.desc,
          category: seed.category,
          coverImage: seed.coverImage,
          gradient: seed.gradient,
          tagColor: seed.tagColor,
          badge: seed.badge ?? null,
          canFDECustom: true,
          authorId: seed.authorId,
          authorName: seed.authorName,
          price: seed.price,
          pricingPlans: toJson({
            monthlyPrice: seed.price,
            annualPrice: Math.max(seed.price * 10, 0),
            buyoutPrice: Math.max(seed.price * 20, 0),
            preferredPlan: 'monthly'
          }),
          likesCount: '36',
          favoritesCount: '18',
          commentsCount: '2',
          sharesCount: '4',
          usageCount: '120',
          rating: 4.6,
          status: 'offline',
          showOnHome: false,
          featured: false,
          sortOrder: seed.sortOrder,
          creatorDeletedAt: deletedAt,
          createdAt: new Date(deletedAt.getTime() - 14 * 24 * 60 * 60 * 1000),
          solutionPayload: buildSolutionPayload({ ...seed, status: 'offline' })
        };
      })
    });
  }

  for (const seed of toMark) {
    const deletedAt = new Date(Date.now() - seed.deletedDaysAgo * 24 * 60 * 60 * 1000);
    await prisma.agent.update({
      where: { id: seed.id },
      data: {
        status: 'offline',
        showOnHome: false,
        creatorDeletedAt: deletedAt
      }
    });
  }
}
