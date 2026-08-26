import React, { useState } from 'react';
import {
  ChevronLeft,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Send
} from 'lucide-react';
import { HellomeAgentItem } from '../data/mockData';
import { mockExperts } from '../data/mockData';
import { getStandardVersionForAgent } from '../data/agentInstanceMockData';

interface AgentDetailViewProps {
  agent: HellomeAgentItem;
  onBack: () => void;
  onOpenAuthorProfile: (authorId: string) => void;
  onConsultAuthor?: (agent: HellomeAgentItem, initialPrompt?: string) => void;
  onCustomizeFromAgent?: (agent: HellomeAgentItem) => void;
  onUseAgent?: (agent: HellomeAgentItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (agentId: string) => void;
  isLiked?: boolean;
  onToggleLike?: (agentId: string) => void;
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({
  agent,
  onBack,
  onOpenAuthorProfile,
  onConsultAuthor,
  onCustomizeFromAgent,
  onUseAgent
}) => {
  const [followed, setFollowed] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  const authorExpert = mockExperts.find((e) => e.id === agent.authorId) || mockExperts[0];
  const standardVersion = getStandardVersionForAgent(agent.id);

  const permissionRows: Array<{ label: string; allowed: boolean }> = [
    { label: '生成内容可用权', allowed: true },
    { label: '商业使用', allowed: true },
    { label: '基于此智能体定制', allowed: agent.canFDECustom !== false },
    { label: '平台内分享与收藏', allowed: true },
    { label: '二次分发源码', allowed: false }
  ];

  return (
    <div id="agent-detail-view" className="min-h-full bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-4 sm:py-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-0.5 text-[13px] text-slate-500 hover:text-slate-900 cursor-pointer mb-4"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          <span>返回</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_268px] gap-8 lg:gap-10 items-start">
          {/* 左栏 */}
          <div className="min-w-0 space-y-5">
            <header className="space-y-1.5">
              <h1 className="text-[26px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-snug">
                {agent.title}
              </h1>
              <p className="text-[13px] text-slate-400">{agent.category}</p>
            </header>

            <div className="rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/80">
              <div className="aspect-[16/9] w-full">
                <img
                  src={agent.coverImage}
                  alt={agent.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <p className="text-[14px] text-slate-600 leading-[1.75] whitespace-pre-wrap">
              {agent.desc}
            </p>

            <section className="pt-2 border-t border-slate-100">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">
                共 {agent.commentsCount} 条评论
              </h3>
              <div className="flex items-center gap-3">
                <img
                  src={authorExpert.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 opacity-80"
                />
                <div className="flex-1 min-w-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 h-10 focus-within:bg-white focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/5">
                  <input
                    type="text"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="谈谈你的看法"
                    className="flex-1 min-w-0 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={!commentDraft.trim()}
                    onClick={() => setCommentDraft('')}
                    className={`shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold cursor-pointer ${
                      commentDraft.trim()
                        ? 'text-slate-900 hover:text-blue-600'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Send size={13} />
                    <span>发送</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* 右栏 */}
          <aside className="lg:sticky lg:top-20 space-y-0 text-[13px]">
            {/* 作者 */}
            <div className="flex items-start gap-3 pb-4">
              <button
                type="button"
                onClick={() => onOpenAuthorProfile(agent.authorId || authorExpert.id)}
                className="shrink-0 cursor-pointer"
              >
                <img
                  src={authorExpert.avatar}
                  alt={authorExpert.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
              </button>
              <div className="flex-1 min-w-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => onOpenAuthorProfile(agent.authorId || authorExpert.id)}
                  className="text-left cursor-pointer group w-full"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[14px] font-semibold text-slate-900 truncate group-hover:text-blue-600">
                      {agent.authorName || authorExpert.name}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[12px] text-slate-400">
                    <span>动态 {authorExpert.ordersCount || 0}</span>
                    <span>粉丝 {Math.max(12, Math.round((authorExpert.ordersCount || 1) * 3))}</span>
                  </div>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFollowed((v) => !v)}
                className={`shrink-0 mt-1 px-3 h-7 rounded-md text-[12px] font-semibold cursor-pointer transition-colors ${
                  followed
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {followed ? '已关注' : '关注'}
              </button>
            </div>

            {/* 互动数 */}
            <div className="grid grid-cols-4 gap-1 py-3 border-y border-slate-100 text-center">
              {[
                { label: '投喂', value: agent.usageCount || '0' },
                { label: '评论', value: agent.commentsCount },
                { label: '收藏', value: agent.favoritesCount },
                { label: '分享', value: '0' }
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[15px] font-semibold text-slate-900 tabular-nums leading-none">
                    {item.value}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">{item.label}</div>
                </div>
              ))}
            </div>

            {/* 操作 */}
            <div className="flex items-center gap-2 py-4">
              {onUseAgent && (
                <button
                  type="button"
                  onClick={() => onUseAgent(agent)}
                  className="flex-1 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <Zap size={14} className="fill-white" />
                  <span>立即体验</span>
                </button>
              )}
              {agent.canFDECustom !== false && (onCustomizeFromAgent || onConsultAuthor) && (
                <button
                  type="button"
                  id="btn-customize-from-agent"
                  onClick={() => {
                    if (onCustomizeFromAgent) onCustomizeFromAgent(agent);
                    else onConsultAuthor?.(agent);
                  }}
                  className="flex-1 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] transition-transform px-2"
                >
                  <span className="leading-tight text-center">基于此智能体定制</span>
                  <ArrowRight size={13} className="shrink-0 text-slate-400" />
                </button>
              )}
            </div>

            {/* 时间 */}
            <dl className="space-y-2.5 py-3 border-t border-slate-100">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">最近更新</dt>
                <dd className="text-slate-700 tabular-nums">2024/06/20</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">首次发布</dt>
                <dd className="text-slate-700 tabular-nums">2024/06/20</dd>
              </div>
            </dl>

            {/* 基本信息 */}
            <div className="py-3 border-t border-slate-100 space-y-2.5">
              <h4 className="text-[12px] font-semibold text-slate-900 mb-1">基本信息</h4>
              <dl className="space-y-2.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400 shrink-0">开发人员</dt>
                  <dd className="text-slate-700 text-right truncate">
                    {agent.authorName || authorExpert.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400 shrink-0">分类</dt>
                  <dd className="text-slate-700 text-right">{agent.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400 shrink-0">版本</dt>
                  <dd className="text-slate-700 text-right tabular-nums">{standardVersion}</dd>
                </div>
              </dl>
            </div>

            {/* 许可 */}
            <div className="py-3 border-t border-slate-100 space-y-2.5">
              <h4 className="text-[12px] font-semibold text-slate-900 mb-1">许可范围</h4>
              <ul className="space-y-2">
                {permissionRows.map((row) => (
                  <li key={row.label} className="flex items-center gap-2 text-slate-600">
                    {row.allowed ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-slate-300 shrink-0" />
                    )}
                    <span className={row.allowed ? '' : 'text-slate-400'}>{row.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

/** @deprecated 使用 AgentDetailView 页内打开 */
export const AgentDetailModal = AgentDetailView;
