import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Sparkles, User, X } from 'lucide-react';
import type { HellomeAgentItem } from '../data/mockData';
import { pricingFromAgent, pricingLabel } from '../../shared/pricingPlans';

export type AgentRecommendItem = HellomeAgentItem & {
  reason: string;
  matchScore?: number;
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

export const AgentRecommendModal: React.FC<AgentRecommendModalProps> = ({
  query,
  loading,
  error,
  summary,
  intents = [],
  items,
  onClose,
  onOpenAgent,
  onOpenAuthor
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Sparkles size={11} />
                AI 匹配
              </span>
            </div>
            <h3 className="text-[15px] font-black text-slate-900 leading-snug">
              根据你的需求推荐智能体
            </h3>
            <p className="text-[12px] text-slate-500 line-clamp-2">「{query}」</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 size={22} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium">正在理解你的需求并匹配智能体…</p>
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              {(summary || intents.length > 0) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                  {summary ? (
                    <p className="text-[13px] text-slate-700 leading-relaxed">{summary}</p>
                  ) : null}
                  {intents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {intents.map((intent) => (
                        <span
                          key={intent}
                          className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600"
                        >
                          {intent}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {items.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">暂时没有匹配到智能体，换个说法再试试。</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-[12px] text-slate-400">为你推荐 {items.length} 款</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((agent) => {
                      const pricing = pricingFromAgent(agent);
                      const priceText = pricingLabel(pricing);
                      return (
                        <article
                          key={agent.id}
                          className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenAgent(agent)}
                            className="text-left cursor-pointer"
                          >
                            <div className="relative h-32 bg-slate-100">
                              <img
                                src={agent.coverImage}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <span
                                className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  pricing.isFree
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/95 text-slate-900'
                                }`}
                              >
                                {priceText}
                              </span>
                            </div>
                            <div className="p-3.5 space-y-2">
                              <h4 className="text-[13px] font-bold text-slate-900 line-clamp-1">
                                {agent.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {agent.desc}
                              </p>
                              <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5 leading-relaxed">
                                {agent.reason}
                              </p>
                            </div>
                          </button>
                          {agent.authorId ? (
                            <button
                              type="button"
                              onClick={() => onOpenAuthor(agent.authorId!)}
                              className="px-3.5 pb-3.5 -mt-1 inline-flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                            >
                              <User size={11} />
                              <span className="truncate">{agent.authorName || '官方认证'}</span>
                            </button>
                          ) : (
                            <div className="px-3.5 pb-3.5 -mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                              <User size={11} />
                              <span>{agent.authorName || '官方认证'}</span>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
