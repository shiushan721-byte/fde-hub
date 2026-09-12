import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Heart,
  Info,
  MessageCircle,
  Minus,
  Send,
  Sparkles,
  User,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import type { HellomeAgentItem } from '../data/mockData';
import { mockExperts } from '../data/mockData';
import { activeCustomProjects } from '../../shared/customProjects';
import { pricingFromAgent, pricingLabel } from '../../shared/pricingPlans';
import { useCatalog } from '../lib/catalog';

export type WorkbenchTab = HellomeAgentItem;

const INFO_CARD_STORAGE_KEY = 'hellome.workbench.infoCard.expanded';

function readInfoCardExpanded() {
  try {
    const value = window.localStorage.getItem(INFO_CARD_STORAGE_KEY);
    if (value === '0') return false;
    if (value === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

function writeInfoCardExpanded(expanded: boolean) {
  try {
    window.localStorage.setItem(INFO_CARD_STORAGE_KEY, expanded ? '1' : '0');
  } catch {
    /* ignore */
  }
}

interface LocalWorkbenchViewProps {
  agents: HellomeAgentItem[];
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  onOpenAgent: (agent: HellomeAgentItem) => void;
  onBrowseMarket: () => void;
  onCustomize?: (agent: HellomeAgentItem, projectIds?: string[]) => void;
  onOpenAuthor?: (authorId: string) => void;
  onOpenAgentDetail?: (agent: HellomeAgentItem) => void;
}

const FEATURED_IDS = ['hz-canvas', 'img-compress', 'geo-helper', 'doc-emergency'];

function featuredAgents(agents: HellomeAgentItem[]) {
  const picked = FEATURED_IDS.map((id) => agents.find((agent) => agent.id === id)).filter(
    (agent): agent is HellomeAgentItem => Boolean(agent)
  );
  if (picked.length >= 4) return picked.slice(0, 4);
  const extra = agents.filter((agent) => !picked.some((item) => item.id === agent.id));
  return [...picked, ...extra].slice(0, 4);
}

export const LocalWorkbenchView: React.FC<LocalWorkbenchViewProps> = ({
  agents,
  tabs,
  activeTabId,
  onOpenAgent,
  onBrowseMarket,
  onCustomize,
  onOpenAuthor,
  onOpenAgentDetail
}) => {
  const active = tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null;
  const suggestions = useMemo(() => featuredAgents(agents), [agents]);
  const [infoExpanded, setInfoExpanded] = useState(readInfoCardExpanded);

  const setInfoCardExpanded = (expanded: boolean) => {
    setInfoExpanded(expanded);
    writeInfoCardExpanded(expanded);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#f7f7f8]">
      {active ? (
        <AgentWorkbenchPane
          agent={active}
          infoExpanded={infoExpanded}
          onToggleInfo={setInfoCardExpanded}
          onCustomize={onCustomize}
          onOpenAuthor={onOpenAuthor}
          onOpenAgentDetail={onOpenAgentDetail}
        />
      ) : (
        <div className="flex-1 min-h-0 relative overflow-auto">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: 'radial-gradient(#d6d6db 1px, transparent 1px)',
              backgroundSize: '18px 18px'
            }}
          />
          <div className="relative min-h-full flex flex-col items-center justify-center px-6 py-16">
            <div className="text-center space-y-2 mb-10">
              <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">今天想做点什么？</h1>
              <p className="text-sm text-slate-400">选择一个智能体开始～</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-5xl">
              {suggestions.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onOpenAgent(agent)}
                  className="text-left bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="h-32 bg-slate-100">
                    <img
                      src={agent.coverImage}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3.5 space-y-2">
                    <h3 className="text-[13px] font-bold text-slate-900 line-clamp-1">{agent.title}</h3>
                    <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed">{agent.desc}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="truncate max-w-[55%]">{agent.authorName || 'HelloMe官方'}</span>
                      <span className="inline-flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-0.5">
                          <Heart size={11} />
                          {agent.likesCount || '210'}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <MessageCircle size={11} />
                          {agent.commentsCount || '88'}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onBrowseMarket}
              className="mt-10 h-9 px-4 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              去看更多 <span className="ml-1">›</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AgentWorkbenchPane: React.FC<{
  agent: HellomeAgentItem;
  infoExpanded: boolean;
  onToggleInfo: (expanded: boolean) => void;
  onCustomize?: (agent: HellomeAgentItem, projectIds?: string[]) => void;
  onOpenAuthor?: (authorId: string) => void;
  onOpenAgentDetail?: (agent: HellomeAgentItem) => void;
}> = ({ agent, infoExpanded, onToggleInfo, onCustomize, onOpenAuthor, onOpenAgentDetail }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `已在本地工作台打开「${agent.title}」。直接输入你要做的事，我会按这个智能体的能力来处理。`
    }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `已在本地工作台打开「${agent.title}」。直接输入你要做的事，我会按这个智能体的能力来处理。`
      }
    ]);
    setInput('');
  }, [agent.id, agent.title]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      {
        role: 'assistant',
        content: `已用「${agent.title}」处理：${text}\n\n${agent.desc}`
      }
    ]);
  };

  return (
    <div className="flex-1 min-h-0 relative">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(#d6d6db 1px, transparent 1px)',
          backgroundSize: '18px 18px'
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="w-full max-w-4xl h-full bg-white rounded-[28px] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
          <div className="h-40 shrink-0 bg-slate-100 relative">
            <img
              src={agent.coverImage}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 text-white">
              <p className="text-[11px] text-white/80 mb-1">{agent.category}</p>
              <h2 className="text-lg font-bold">{agent.title}</h2>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((msg, index) => (
              <div
                key={`${index}-${msg.role}`}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form
            className="p-4 border-t border-slate-100 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`向「${agent.title}」下达任务…`}
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:bg-white focus:border-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
      <WorkbenchAgentInfoCard
        agent={agent}
        expanded={infoExpanded}
        onToggle={onToggleInfo}
        onCustomize={onCustomize}
        onOpenAuthor={onOpenAuthor}
        onOpenAgentDetail={onOpenAgentDetail}
      />
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-white/90 border border-slate-200 px-2 py-1 text-[11px] text-slate-500 shadow-xs">
        <ZoomOut size={12} />
        <span>100%</span>
        <ZoomIn size={12} />
      </div>
    </div>
  );
};

const WorkbenchAgentInfoCard: React.FC<{
  agent: HellomeAgentItem;
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
  onCustomize?: (agent: HellomeAgentItem, projectIds?: string[]) => void;
  onOpenAuthor?: (authorId: string) => void;
  onOpenAgentDetail?: (agent: HellomeAgentItem) => void;
}> = ({ agent, expanded, onToggle, onCustomize, onOpenAuthor, onOpenAgentDetail }) => {
  const catalog = useCatalog();
  const expert =
    catalog.experts.find((item) => item.id === agent.authorId) ||
    mockExperts.find((item) => item.id === agent.authorId) ||
    catalog.experts[0] ||
    mockExperts[0];
  const projects = agent.canFDECustom === false ? [] : activeCustomProjects(agent.customProjects || []);
  const canCustomize = agent.canFDECustom !== false && Boolean(onCustomize);
  const pricing = pricingFromAgent(agent);
  const priceText = pricingLabel(pricing);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => onToggle(true)}
        className="absolute top-4 right-4 z-20 h-9 px-3 rounded-full bg-white/95 border border-slate-200 shadow-md text-[12px] font-semibold text-slate-700 hover:bg-white cursor-pointer inline-flex items-center gap-1.5"
      >
        <Info size={13} className="text-blue-600" />
        智能体简介
      </button>
    );
  }

  return (
    <aside className="absolute top-4 right-4 z-20 w-[300px] max-h-[min(72vh,560px)] bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">快捷了解</span>
        <button
          type="button"
          onClick={() => onToggle(false)}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer inline-flex items-center justify-center"
          aria-label="收起简介"
        >
          <Minus size={14} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 mb-0.5">{agent.category}</p>
              <h3 className="text-[14px] font-extrabold text-slate-900 leading-snug">{agent.title}</h3>
            </div>
            <span
              className={`shrink-0 text-[12px] font-bold ${pricing.isFree ? 'text-emerald-600' : 'text-slate-900'}`}
            >
              {priceText}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed line-clamp-3">{agent.desc}</p>
        </div>

        {canCustomize && (
          <div>
            <p className="text-[11px] font-bold text-slate-800 mb-1.5">支持的定制项目</p>
            {projects.length === 0 ? (
              <p className="text-[11px] text-slate-400">暂无标准项目，可直接咨询专家定制。</p>
            ) : (
              <ul className="space-y-1.5">
                {projects.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onCustomize?.(agent, [item.id])}
                      className="w-full text-left rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 px-2.5 py-2 cursor-pointer"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-slate-900 truncate">{item.title}</span>
                        <span className="text-[12px] font-extrabold text-amber-600 shrink-0">¥{item.price}</span>
                      </span>
                      {item.description ? (
                        <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {item.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
          <p className="text-[10px] font-bold text-slate-400 mb-2">归属专家</p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenAuthor?.(agent.authorId || expert.id)}
              className="shrink-0 cursor-pointer"
            >
              <img
                src={expert.avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpenAuthor?.(agent.authorId || expert.id)}
                className="text-left cursor-pointer group w-full"
              >
                <span className="block text-[12px] font-bold text-slate-900 truncate group-hover:text-blue-600">
                  {agent.authorName || expert.name}
                </span>
                <span className="block text-[10px] text-slate-400 truncate">
                  {expert.verifyLabel || expert.roleTag || 'AI 专家'}
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuthor?.(agent.authorId || expert.id)}
              className="shrink-0 h-7 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-0.5"
            >
              <User size={11} />
              主页
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-100 space-y-2 shrink-0">
        {canCustomize && (
          <button
            type="button"
            onClick={() => onCustomize?.(agent)}
            className="w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
          >
            <Sparkles size={13} />
            基于此智能体定制
            <ArrowRight size={13} />
          </button>
        )}
        {onOpenAgentDetail && (
          <button
            type="button"
            onClick={() => onOpenAgentDetail(agent)}
            className="w-full h-8 rounded-lg text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer inline-flex items-center justify-center gap-0.5"
          >
            查看完整介绍
            <ChevronRight size={13} />
          </button>
        )}
      </div>
    </aside>
  );
};
