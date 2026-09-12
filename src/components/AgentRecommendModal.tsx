import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  Check,
  ChevronRight,
  Heart,
  Images,
  Loader2,
  MessageCircle,
  Sparkles,
  Star,
  User,
  X
} from 'lucide-react';
import type { HellomeAgentItem } from '../data/mockData';
import { pricingFromAgent, pricingLabel } from '../../shared/pricingPlans';

export type AgentRecommendItem = HellomeAgentItem & {
  reason: string;
  matchScore?: number;
  groupTitle?: string;
  groupIntro?: string;
};

interface AgentRecommendModalProps {
  query: string;
  loading: boolean;
  error?: string;
  summary?: string;
  intents?: string[];
  items: AgentRecommendItem[];
  source?: 'ai' | 'local';
  onClose: () => void;
  onOpenAgent: (agent: HellomeAgentItem) => void;
  onOpenAuthor: (authorId: string) => void;
}

const ANALYSIS_STEPS = [
  { key: 'read', label: '理解你要完成的事', hint: '从这句话还原任务、约束和交付物' },
  { key: 'scan', label: '分析每个智能体的实际能力', hint: '对照能力说明，而不是看名字像不像' },
  { key: 'match', label: '解释为什么推荐它来做', hint: '写清这个产品适合完成哪一步' }
] as const;

function parseCount(value: string | number | undefined) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value).trim().toLowerCase().replace(/,/g, '');
  const match = text.match(/^([\d.]+)\s*([k万])?$/i);
  if (!match) {
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(match[1]);
  if (match[2] === 'k') return Math.round(n * 1000);
  if (match[2] === '万') return Math.round(n * 10000);
  return Math.round(n);
}

function displayCount(value: string | number | undefined, fallback = 0) {
  if (value != null && String(value).trim() !== '') return String(value);
  if (fallback >= 10000) return `${(fallback / 10000).toFixed(1).replace(/\.0$/, '')}万`;
  if (fallback >= 1000) return `${(fallback / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(fallback);
}

function showcaseCountOf(agent: AgentRecommendItem) {
  if (typeof agent.showcaseCount === 'number' && agent.showcaseCount > 0) return agent.showcaseCount;
  const likes = parseCount(agent.likesCount);
  return Math.max(4, Math.round(likes / 120) || 4);
}

const RecommendAgentCard: React.FC<{
  agent: AgentRecommendItem;
  onOpenAgent: (agent: HellomeAgentItem) => void;
  onOpenAuthor: (authorId: string) => void;
}> = ({ agent, onOpenAgent, onOpenAuthor }) => {
  const pricing = pricingFromAgent(agent);
  const priceText = pricingLabel(pricing);
  const stats = [
    { key: 'likes', label: '点赞', value: displayCount(agent.likesCount, 1200), Icon: Heart },
    { key: 'comments', label: '评论', value: displayCount(agent.commentsCount, 88), Icon: MessageCircle },
    { key: 'favorites', label: '收藏', value: displayCount(agent.favoritesCount, 860), Icon: Bookmark },
    { key: 'works', label: '作品', value: String(showcaseCountOf(agent)), Icon: Images }
  ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="sm:flex">
        <button
          type="button"
          onClick={() => onOpenAgent(agent)}
          className="block w-full sm:w-44 h-36 sm:h-auto shrink-0 bg-slate-100 cursor-pointer"
          aria-label={`打开「${agent.title}」详情`}
        >
          <img
            src={agent.coverImage}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover min-h-[144px]"
          />
        </button>
        <div className="flex-1 min-w-0 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenAgent(agent)}
                  className="text-left text-[15px] font-extrabold text-slate-950 hover:text-blue-700 cursor-pointer"
                >
                  {agent.title}
                </button>
                {agent.badge ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                    {agent.badge}
                  </span>
                ) : null}
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                  {agent.category}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-slate-500 leading-relaxed line-clamp-2">{agent.desc}</p>
            </div>
            <div className="shrink-0 text-right">
              <div
                className={`text-[15px] font-extrabold ${pricing.isFree ? 'text-emerald-600' : 'text-slate-900'}`}
              >
                {priceText}
              </div>
              {agent.rating ? (
                <div className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600">
                  <Star size={11} className="fill-amber-500 text-amber-500" />
                  {agent.rating}
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-[13px] text-slate-600 leading-6">
            <span className="font-semibold text-slate-800">推荐理由：</span>
            {agent.reason}
          </p>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (agent.authorId) onOpenAuthor(agent.authorId);
              }}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:underline cursor-pointer"
              title={agent.authorId ? `查看作者「${agent.authorName || '认证创作者'}」` : undefined}
            >
              <User size={13} />
              <span>{agent.authorName || 'Hellome官方'}</span>
            </button>
            <span className="text-[11px] text-slate-400">使用 {displayCount(agent.usageCount, 1280)}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {stats.map((item) => (
              <div
                key={item.key}
                className="rounded-xl bg-slate-50 border border-slate-100 px-2 py-2 text-center"
              >
                <div className="flex items-center justify-center gap-1 text-slate-400">
                  <item.Icon size={11} />
                  <span className="text-[10px]">{item.label}</span>
                </div>
                <div className="mt-1 text-[13px] font-extrabold text-slate-900 tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => onOpenAgent(agent)}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-800 cursor-pointer"
            >
              查看详情
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export const AgentRecommendModal: React.FC<AgentRecommendModalProps> = ({
  query,
  loading,
  error,
  summary,
  items,
  onClose,
  onOpenAgent,
  onOpenAuthor
}) => {
  const [step, setStep] = useState(0);
  const recommended = items.slice(0, 6);
  const revealResults = !loading && step >= 2;
  const groups = useMemo(() => {
    const ordered: Array<{ title: string; intro: string; items: AgentRecommendItem[] }> = [];
    for (const item of recommended) {
      const title = item.groupTitle || '1. 按实际能力推荐';
      const intro = item.groupIntro || '这类产品适合用来完成你这次的任务：';
      const existing = ordered.find((group) => group.title === title);
      if (existing) existing.items.push(item);
      else ordered.push({ title, intro, items: [item] });
    }
    return ordered;
  }, [recommended]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setStep(0);
    const timers = [
      window.setTimeout(() => setStep(1), 420),
      window.setTimeout(() => setStep(2), 980)
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [query]);

  useEffect(() => {
    if (loading || step < 2) return;
    const timer = window.setTimeout(() => setStep(3), 280);
    return () => window.clearTimeout(timer);
  }, [loading, step]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <Sparkles size={11} />
            {step < 3 || loading ? 'AI 分析中' : 'AI 分析'}
          </span>
          <div className="flex items-start gap-2">
            <span className="max-w-[240px] sm:max-w-sm px-3 py-1.5 rounded-full bg-slate-100 text-[12px] text-slate-600 leading-snug">
              {query}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-8">
          {!revealResults && (
            <div className="py-6 space-y-4">
              {ANALYSIS_STEPS.map((item, index) => {
                const done = step > index;
                const active = step === index && !done;
                return (
                  <div key={item.key} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : active
                            ? 'bg-white border border-emerald-200 text-emerald-600'
                            : 'bg-white border border-slate-200 text-slate-300'
                      }`}
                    >
                      {done ? (
                        <Check size={12} strokeWidth={3} />
                      ) : active ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <span className="text-[10px] font-bold">{index + 1}</span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-bold ${done || active ? 'text-slate-900' : 'text-slate-400'}`}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500">{item.hint}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {revealResults && error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mt-2">
              {error}
            </p>
          )}

          {revealResults && !error && (
            <article className="pt-2 pb-2 text-[15px] text-slate-700 leading-8">
              {summary ? <p className="mb-6">{summary}</p> : null}

              {recommended.length === 0 ? (
                <p className="text-slate-500">按现有智能体的能力说明，暂时没有能直接完成这件事的产品。</p>
              ) : (
                groups.map((group) => (
                  <section key={group.title} className="mb-7">
                    <h3 className="text-[16px] font-extrabold text-slate-950 mb-2">{group.title}</h3>
                    <p className="mb-4 text-slate-600 leading-7">{group.intro}</p>
                    <div className="space-y-3">
                      {group.items.map((agent) => (
                        <RecommendAgentCard
                          key={agent.id}
                          agent={agent}
                          onOpenAgent={onOpenAgent}
                          onOpenAuthor={onOpenAuthor}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </article>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
