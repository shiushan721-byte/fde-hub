import { GoogleGenAI } from '@google/genai';
import { prisma } from '../lib/prisma';
import { agentToCatalog } from '../lib/mappers';

export type RecommendedAgent = ReturnType<typeof agentToCatalog> & {
  reason: string;
  matchScore: number;
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

const QUERY_EXPANSIONS: Array<{ keys: string[]; extra: string[] }> = [
  { keys: ['视觉', 'kv', '主视觉', '海报', '分镜', '出图', '包装', '品牌'], extra: ['画布', '图片'] },
  { keys: ['视频', '成片', '短视频', '镜头'], extra: ['视频', '画布', '创作'] },
  { keys: ['geo', '收录', '搜索', '问答', '长文', '可见度'], extra: ['geo', '搜索'] },
  { keys: ['公文', '应急', '通知', '红头', '政务'], extra: ['公文', '应急'] },
  { keys: ['压缩', '体积', '瘦身', '图片优化'], extra: ['压缩', '图片'] }
];

const STOP_TOKENS = new Set([
  '帮我',
  '我想',
  '给我',
  '一个',
  '一下',
  '可以',
  '怎么',
  '如何',
  '需要',
  '想要',
  '出三',
  '三套',
  '套主',
  '饮出',
  '给新',
  '然后',
  '这个',
  '那个'
]);

function queryTokens(query: string) {
  const normalized = query.toLowerCase().replace(/\s+/g, ' ').trim();
  const parts = normalized
    .split(/[^\u4e00-\u9fffA-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !STOP_TOKENS.has(part));
  const grams: string[] = [];
  const compact = normalized.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '');
  for (let i = 0; i < compact.length - 1; i += 1) {
    const gram = compact.slice(i, i + 2);
    if (/[\u4e00-\u9fff]/.test(gram) && !STOP_TOKENS.has(gram)) grams.push(gram);
  }
  return { normalized, tokens: [...new Set([...parts, ...grams])] };
}

function expansionExtras(normalized: string) {
  const extras: string[] = [];
  for (const rule of QUERY_EXPANSIONS) {
    if (rule.keys.some((key) => normalized.includes(key))) extras.push(...rule.extra);
  }
  return [...new Set(extras)];
}

function localRank(query: string, agents: ReturnType<typeof agentToCatalog>[]) {
  const { normalized, tokens } = queryTokens(query);
  const extras = expansionExtras(normalized);
  const ranked = agents
    .map((agent) => {
      const title = agent.title.toLowerCase();
      const desc = agent.desc.toLowerCase();
      const category = agent.category.toLowerCase();
      let score = 0;
      const hits: string[] = [];
      for (const token of tokens) {
        if (title.includes(token)) {
          score += 8;
          hits.push(token);
        } else if (category.includes(token)) {
          score += 6;
          hits.push(token);
        } else if (desc.includes(token)) {
          score += 3;
          hits.push(token);
        }
      }
      for (const extra of extras) {
        if (title.includes(extra)) {
          score += 10;
          hits.push(extra);
        } else if (desc.includes(extra)) {
          score += 4;
        }
      }
      const uniqueHits = [...new Set(hits)].slice(0, 3);
      const reason = uniqueHits.length
        ? `和你提到的「${uniqueHits.join('、')}」对得上，适合直接拿来试。`
        : `属于「${agent.category}」，可作为相近方案参考。`;
      return { agent, score, reason, intents: uniqueHits };
    })
    .sort((a, b) => b.score - a.score || Number(b.agent.rating || 0) - Number(a.agent.rating || 0));

  const matched = ranked.filter((row) => row.score >= 8).slice(0, MAX_ITEMS);
  const picked = matched.length > 0 ? matched : ranked.filter((row) => row.score > 0).slice(0, 3);
  const items = (picked.length > 0 ? picked : ranked.slice(0, 3)).map((row) => ({
    ...row.agent,
    reason: row.reason,
    matchScore: row.score
  }));
  const intents = [...new Set(picked.flatMap((row) => row.intents).concat(extras))].slice(0, 4);
  const summary = matched.length
    ? `更适合从「${intents.join('、') || items[0]?.category || '相关能力'}」方向匹配，下面是按需求排过的智能体。`
    : '没有特别贴合的结果，先给你几款相近的智能体。';
  return { summary, intents, items };
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
      summary?: string;
      intents?: string[];
      matches?: Array<{ id?: string; reason?: string; score?: number }>;
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
  agents: ReturnType<typeof agentToCatalog>[]
): Promise<AgentRecommendResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const catalog = agents.map((agent) => ({
    id: agent.id,
    title: agent.title,
    desc: agent.desc.slice(0, 160),
    category: agent.category
  }));
  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `你是 Hellome 智能体商店的推荐助手。根据用户的自然语言需求，从目录里挑最合适的智能体。
只返回 JSON，不要 markdown：
{"summary":"一句话说明你如何理解需求","intents":["不超过4个短标签"],"matches":[{"id":"目录里的id","reason":"不超过28字的推荐理由","score":0到100}]}
最多 ${MAX_ITEMS} 条，按匹配度降序。只能使用目录中的 id。

用户需求：${query}

目录：${JSON.stringify(catalog)}`
    }),
    8000
  );
  const parsed = extractJson(response.text || '');
  if (!parsed) return null;
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const items = (parsed.matches || [])
    .map((match) => {
      const agent = match.id ? byId.get(match.id) : undefined;
      if (!agent) return null;
      return {
        ...agent,
        reason: (match.reason || '').trim() || `和「${agent.category}」场景匹配。`,
        matchScore: Number(match.score) || 0
      };
    })
    .filter((item): item is RecommendedAgent => Boolean(item))
    .slice(0, MAX_ITEMS);
  if (items.length === 0) return null;
  return {
    query,
    source: 'ai',
    analysis: {
      summary: (parsed.summary || '').trim() || '已根据你的描述完成匹配。',
      intents: (parsed.intents || []).map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
    },
    items
  };
}

export async function recommendAgents(query: string): Promise<AgentRecommendResult> {
  const q = query.trim().slice(0, 500);
  const rows = await prisma.agent.findMany({
    where: { kind: 'catalog', status: 'published', creatorDeletedAt: null },
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }]
  });
  const catalog = rows.map(agentToCatalog);
  const local = localRank(q, catalog);

  try {
    const aiResult = await rankWithGemini(q, catalog);
    if (aiResult) return aiResult;
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
    items: local.items
  };
}
