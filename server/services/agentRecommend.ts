import { GoogleGenAI } from '@google/genai';
import type { Agent } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJson } from '../lib/json';
import { agentToCatalog } from '../lib/mappers';

export type RecommendedAgent = ReturnType<typeof agentToCatalog> & {
  reason: string;
  matchScore: number;
  groupTitle?: string;
  groupIntro?: string;
  showcaseCount?: number;
};

export type AgentRecommendResult = {
  query: string;
  source: 'ai' | 'local';
  analysis: {
    summary: string;
    intents: string[];
  };
  items: RecommendedAgent[];
};

const MAX_ITEMS = 6;
const CAPABILITY_SCORE_MIN = 10;
const FILL_MIN = 4;

type AgentProfile = {
  agent: ReturnType<typeof agentToCatalog> & { showcaseCount?: number };
  doesText: string;
  jobs: string[];
  blurb: string;
  capabilities: string[];
  description: string;
};

/** 用户任务理解：从这句话还原要做的事，而不是拿原句去撞标题 */
const JOB_LIBRARY: Array<{
  job: string;
  cues: string[];
  strong: string[];
  weak?: string[];
}> = [
  {
    job: '起草公文/请示/上会材料',
    cues: ['请示', '公文', '通知', '报告', '红头', '上会', '出稿', '文书', '纪要', '汇报', '连夜'],
    strong: ['公文', '文书', '请示', '通知', '红头', '政务', '纪要'],
    weak: ['起草', '上会']
  },
  {
    job: '做品牌视觉/主视觉 KV',
    cues: ['kv', '主视觉', '海报', '包装', '出图', '画布', '分镜', '视觉', '品牌形象'],
    strong: ['画布', '主视觉', '海报', 'kv'],
    weak: ['视觉', '包装']
  },
  {
    job: '提升 AI 搜索可见度 / GEO 内容',
    cues: ['geo', '可见度', 'ai搜索', '被引用', '种草', '选购长文', '收录', '问答引擎'],
    strong: ['geo', '可见度', '品牌提及'],
    weak: ['搜索', '长文', '关键词']
  },
  {
    job: '做短视频脚本或成片',
    cues: ['视频', '成片', '脚本', '抖音', '剪辑', '镜头', '黄金3秒', '完播'],
    strong: ['短视频', '脚本', '成片', '剪辑'],
    weak: ['分镜', '镜头', '抖音']
  },
  {
    job: '电商客服/售后/订单问题',
    cues: ['客服', '售后', '退换货', '催发货', '订单', '千牛', '聚水潭', '工单'],
    strong: ['客服', '售后', '退换', '千牛', '聚水潭'],
    weak: ['订单', 'erp', '工单', '电商']
  },
  {
    job: '设备维修/工厂排障',
    cues: ['故障', '维修', '机床', '产线', '报警', '排障', '图纸', '工厂'],
    strong: ['故障', '维修', '机床', '排障', '工业机器人'],
    weak: ['设备', '工业', '图纸', '诊断']
  },
  {
    job: '合同/合规审查',
    cues: ['合同', '条款', '合规', '法务', '风险', '审查'],
    strong: ['合同', '法务', '合规审查'],
    weak: ['条款', '风险', '审查']
  },
  {
    job: '财报/研报分析',
    cues: ['财报', '研报', '上市', '财务', '投研'],
    strong: ['财报', '研报', '投研'],
    weak: ['财务', '上市公司']
  },
  {
    job: '求职/简历/面试',
    cues: ['求职', '简历', '面试', 'jd', '投递'],
    strong: ['求职', '简历', '面试'],
    weak: ['招聘']
  },
  {
    job: '图片/PDF 文件处理',
    cues: ['压缩', 'pdf', '合并', '转图', '体积'],
    strong: ['pdf', '图片压缩', '合并'],
    weak: ['压缩', '图片']
  },
  {
    job: '医疗导诊/随访',
    cues: ['导诊', '就医', '慢病', '随访', '分诊'],
    strong: ['导诊', '随访', '分诊', '慢病'],
    weak: ['医疗']
  },
  {
    job: '查找开源项目或 GitHub 工具',
    cues: ['github', '开源', '仓库', 'star'],
    strong: ['github', '开源项目', '开源'],
    weak: ['仓库']
  }
];

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function compactText(value: unknown, max = 280) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, max);
}

function buildProfile(
  row: Agent & { _count?: { showcases: number } }
): AgentProfile {
  const payload = parseJson<Record<string, unknown>>(row.solutionPayload, {});
  const customProjects = parseJson<Array<{ title?: string; description?: string }>>(row.customProjects, []);
  const capabilities = asStringArray(payload.capabilities);
  const tags = asStringArray(payload.tags);
  const prompts = asStringArray(payload.samplePrompts);
  const projectText = customProjects
    .map((item) => `${item.title || ''} ${item.description || ''}`)
    .join(' ');
  const jobs = [...capabilities, ...tags].slice(0, 8);
  const doesText = [
    row.title,
    row.desc,
    row.category,
    compactText(payload.subtitle, 120),
    compactText(payload.description, 360),
    capabilities.join('；'),
    tags.join(' '),
    prompts.join(' '),
    compactText(payload.systemPromptSnippet, 180),
    compactText(payload.businessIntegrationTips, 180),
    projectText
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  const description =
    compactText(payload.description, 220) || compactText(row.desc, 220);
  const blurb = compactText(payload.subtitle, 80) || compactText(row.desc, 80);

  return {
    agent: {
      ...agentToCatalog(row),
      showcaseCount: row._count?.showcases ?? 0
    },
    doesText,
    jobs,
    blurb,
    capabilities,
    description
  };
}

function inferUserJobs(query: string) {
  const normalized = query.toLowerCase();
  const matched = JOB_LIBRARY.filter((item) => item.cues.some((cue) => normalized.includes(cue)));
  const oss = matched.filter((item) => item.job.includes('开源'));
  if (oss.length > 0) return oss;
  return matched;
}

function explainWhy(query: string, job: string, profile: AgentProfile) {
  const positioning = (profile.blurb || profile.description || profile.agent.desc)
    .replace(/。+$/, '')
    .replace(/\.\.\.$/, '');
  const cap = profile.capabilities[0];
  if (cap) {
    return `${positioning}。针对「${query}」，它能${cap.replace(/。+$/, '')}，所以推荐用它来做。`;
  }
  return `${positioning}。针对「${query}」这种「${job}」需求，适合直接拿它来完成。`;
}

function openingFor(query: string, job: string | undefined, count: number) {
  if (!job && count === 0) {
    return `围绕「${query}」，我先还原这件事要交付什么，再对照每个智能体实际上能做什么。当前目录里没有一款能力说明真正覆盖它，因此不按名字相近去凑推荐。`;
  }
  if (!job) {
    return `围绕「${query}」，我按各智能体的能力说明筛选，并解释为什么推荐它来做这件事。`;
  }
  if (count === 0) {
    return `围绕「${query}」，这件事的核心是「${job}」。对照现有智能体的能力说明后，没有一款真正能做完；名字相近也不予推荐。`;
  }
  return `围绕「${query}」，我先看的是这件事本身：要完成「${job}」，而不是找名称里带这些词的应用。根据能力定位和适用场景，下面整理了更适合拿来做的选择：`;
}

function capabilityScore(query: string, profile: AgentProfile) {
  const jobs = inferUserJobs(query);
  let score = 0;
  const hits: string[] = [];

  for (const job of jobs) {
    const strongHits = job.strong.filter((cap) => profile.doesText.includes(cap));
    if (strongHits.length === 0) continue;
    const weakHits = (job.weak || []).filter((cap) => profile.doesText.includes(cap));
    score += 16 + strongHits.length * 6 + weakHits.length * 2;
    hits.push(job.job);
  }

  return { score, hits: [...new Set(hits)].slice(0, 3) };
}

function toRecommendItem(
  row: {
    profile: AgentProfile;
    score: number;
    reason: string;
  },
  groupTitle: string,
  groupIntro: string
): RecommendedAgent {
  return {
    ...row.profile.agent,
    reason: row.reason,
    matchScore: row.score,
    groupTitle,
    groupIntro
  };
}

function localRank(query: string, profiles: AgentProfile[]) {
  const jobs = inferUserJobs(query);
  const ranked = profiles
    .map((profile) => {
      const { score, hits } = capabilityScore(query, profile);
      const job = hits[0] || jobs[0]?.job || profile.agent.category;
      return {
        profile,
        score,
        hits,
        reason: explainWhy(query, job, profile)
      };
    })
    .sort((a, b) => b.score - a.score || Number(b.profile.agent.rating || 0) - Number(a.profile.agent.rating || 0));

  const primary = ranked.filter((row) => row.score >= CAPABILITY_SCORE_MIN).slice(0, MAX_ITEMS);
  const jobLabels = jobs.map((item) => item.job);
  const job = jobLabels[0];
  const groupTitle = job ? `1. ${job}` : '1. 按实际能力推荐';
  const groupIntro = '这类产品的能力说明覆盖你这次要的交付，适合直接拿来做：';
  const items = primary.map((row) => toRecommendItem(row, groupTitle, groupIntro));

  if (items.length < FILL_MIN) {
    const used = new Set(items.map((item) => item.id));
    const primaryCategory = primary[0]?.profile.agent.category;
    const extras = ranked.filter(
      (row) =>
        !used.has(row.profile.agent.id) &&
        (row.score > 0 || (primaryCategory && row.profile.agent.category === primaryCategory))
    );

    const extraTitle = '2. 同类能力也可对照';
    const extraIntro = '主推之外，这些产品也同属相近场景，可以看作者、口碑和作品再决定：';
    for (const row of extras.slice(0, MAX_ITEMS - items.length)) {
      items.push(
        toRecommendItem(
          {
            ...row,
            reason: `${(row.profile.blurb || row.profile.description || row.profile.agent.desc).replace(/。+$/, '')}。它不一定能单独做完「${query}」，但场景相近，值得对照能力和作品。`
          },
          extraTitle,
          extraIntro
        )
      );
    }
  }

  return {
    summary: openingFor(query, job, primary.length),
    intents: jobLabels.slice(0, 4),
    items: items.slice(0, MAX_ITEMS)
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as {
      understanding?: string;
      summary?: string;
      intents?: string[];
      matches?: Array<{ id?: string; reason?: string; why?: string; score?: number }>;
      groups?: Array<{
        title?: string;
        intro?: string;
        matches?: Array<{ id?: string; why?: string; reason?: string; score?: number }>;
      }>;
    };
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function rankWithGemini(
  query: string,
  profiles: AgentProfile[]
): Promise<AgentRecommendResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const catalog = profiles.map((profile) => ({
    id: profile.agent.id,
    title: profile.agent.title,
    category: profile.agent.category,
    capabilities: profile.jobs.slice(0, 6),
    does: compactText(profile.doesText.replace(/\n/g, ' '), 420)
  }));
  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `你是 Hellome 的智能体顾问。用户会说一句自然语言。你必须：
1. 先理解这句话要完成的任务、约束和交付物。
2. 再根据每个智能体的实际能力说明（capabilities / does）判断它能不能做这件事。
3. 禁止因为标题、分类名称和用户用词碰巧相同就推荐。
4. 只能推荐目录里的智能体；最多 ${MAX_ITEMS} 个。先给真正具备该能力的，不够再用同类场景补足，不要只给 1 个。

只返回 JSON：
{"understanding":"80到160字开场，说明你如何理解用户这句话、按什么标准筛选","intents":["不超过4个任务标签"],"groups":[{"title":"1. 分类标题（适合什么场景）","intro":"这类产品为什么适合这件事","matches":[{"id":"目录id","why":"80到140字，解释为什么推荐用这个产品来做用户这件事","score":0到100}]}]}
最多 ${MAX_ITEMS} 个产品；优先给真正能做的，不够再用同类场景补足，不要只给 1 个。

用户原话：${query}

智能体能力档案：${JSON.stringify(catalog)}`
    }),
    20000
  );
  const parsed = extractJson(response.text || '');
  if (!parsed) return null;
  const byId = new Map(profiles.map((profile) => [profile.agent.id, profile.agent]));
  const groupedMatches = (parsed.groups || []).flatMap((group) =>
    (group.matches || []).map((match) => ({
      ...match,
      groupTitle: group.title,
      groupIntro: group.intro
    }))
  );
  const flatMatches = groupedMatches.length > 0 ? groupedMatches : parsed.matches || [];
  const items = flatMatches
    .map((match) => {
      const agent = match.id ? byId.get(match.id) : undefined;
      if (!agent) return null;
      const score = Number(match.score) || 0;
      if (score < 55) return null;
      const why = (match.why || match.reason || '').trim();
      return {
        ...agent,
        reason: why || `它的能力说明表明可以承接这个任务。`,
        matchScore: score,
        groupTitle: 'groupTitle' in match ? match.groupTitle : undefined,
        groupIntro: 'groupIntro' in match ? match.groupIntro : undefined
      };
    })
    .filter((item): item is RecommendedAgent => Boolean(item))
    .slice(0, MAX_ITEMS);
  const understanding =
    (parsed.understanding || parsed.summary || '').trim() ||
    '已按各智能体的实际能力完成筛选，而不是按名称关键词匹配。';
  return {
    query,
    source: 'ai',
    analysis: {
      summary: understanding,
      intents: (parsed.intents || []).map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
    },
    items
  };
}

export async function recommendAgents(query: string): Promise<AgentRecommendResult> {
  const q = query.trim().slice(0, 500);
  const rows = await prisma.agent.findMany({
    where: { status: 'published', creatorDeletedAt: null },
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    include: {
      _count: {
        select: {
          showcases: { where: { status: 'visible' } }
        }
      }
    }
  });
  const profiles = rows.map(buildProfile);
  const local = localRank(q, profiles);

  try {
    const aiResult = await rankWithGemini(q, profiles);
    if (aiResult) {
      const seen = new Set(aiResult.items.map((item) => item.id));
      const merged = [
        ...aiResult.items,
        ...local.items.filter((item) => !seen.has(item.id))
      ].slice(0, MAX_ITEMS);
      return { ...aiResult, items: merged };
    }
  } catch (error) {
    console.warn('agent recommend AI fallback:', error instanceof Error ? error.message : error);
  }

  return {
    query: q,
    source: 'local',
    analysis: {
      summary: local.summary,
      intents: local.intents
    },
    items: local.items.slice(0, MAX_ITEMS)
  };
}
