import React from 'react';
import { Play, Clock, Bookmark, Heart } from 'lucide-react';
import { mockHellomeHomeAgents, HellomeAgentItem } from '../data/mockData';
import { MyExclusiveAgentsSection } from './MyExclusiveAgentsSection';
import { BuyerExclusiveAgentsPanel } from './CustomOrderPanels';
import { mockUserExclusiveAgents } from '../data/agentInstanceMockData';
import { CustomerAgentInstance } from '../types/creator';

interface WorkspaceViewProps {
  onNavigateToHome: () => void;
  onTryAgentItem?: (agent: HellomeAgentItem) => void;
  onOpenAgentDetail?: (agent: HellomeAgentItem) => void;
  onRunExclusiveAgent?: (instance: CustomerAgentInstance) => void;
  favoriteAgentIds?: string[];
  likedAgentIds?: string[];
}

const AgentShelfCard: React.FC<{
  agent: HellomeAgentItem;
  onOpen?: () => void;
  onRun?: () => void;
}> = ({ agent, onOpen, onRun }) => (
  <div
    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all group"
  >
    <button
      type="button"
      onClick={onOpen}
      className="flex items-start gap-3 text-left cursor-pointer"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
        <img
          src={agent.coverImage}
          alt={agent.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      </div>
      <div className="space-y-1 min-w-0">
        <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-600 transition-colors">
          {agent.title}
        </h4>
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
          {agent.category}
        </span>
      </div>
    </button>

    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{agent.desc}</p>

    {onRun && (
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
        <button
          onClick={onRun}
          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Play size={11} className="fill-emerald-600" />
          <span>运行</span>
        </button>
      </div>
    )}
  </div>
);

const EmptyShelf: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({
  icon,
  title,
  hint
}) => (
  <div className="bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center space-y-2">
    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
      {icon}
    </div>
    <p className="text-sm font-bold text-slate-800">{title}</p>
    <p className="text-xs text-slate-500">{hint}</p>
  </div>
);

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  onNavigateToHome,
  onTryAgentItem,
  onOpenAgentDetail,
  onRunExclusiveAgent,
  favoriteAgentIds = [],
  likedAgentIds = []
}) => {
  const recentAgents = mockHellomeHomeAgents.slice(0, 4);
  const favoritedAgents = mockHellomeHomeAgents.filter((agent) =>
    favoriteAgentIds.includes(agent.id)
  );
  const likedAgents = mockHellomeHomeAgents.filter((agent) => likedAgentIds.includes(agent.id));

  return (
    <div id="workspace-view" className="space-y-10 pb-16">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black text-slate-900 font-display">我的智能体</h1>
        <p className="text-xs text-slate-500 mt-1">
          专属实例、收藏与点赞，集中查看你正在使用和关注的智能体
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-bold text-slate-900 text-base">专属智能体</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            运营审核通过并推送后才会出现在此；进度请前往侧边栏「我的定制」
          </p>
        </div>
        <BuyerExclusiveAgentsPanel />
        <MyExclusiveAgentsSection
          instances={mockUserExclusiveAgents}
          onRunInstance={onRunExclusiveAgent}
        />
      </section>

      <section id="favorited-agents" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark size={15} className="fill-amber-500 text-amber-500" />
            <h2 className="font-bold text-slate-900 text-base">收藏的智能体</h2>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700">
              {favoritedAgents.length}
            </span>
          </div>
          <button
            onClick={onNavigateToHome}
            className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
          >
            去市场收藏更多 →
          </button>
        </div>

        {favoritedAgents.length === 0 ? (
          <EmptyShelf
            icon={<Bookmark size={16} />}
            title="暂无收藏的智能体"
            hint="在市场卡片右上角点书签，即可加入此列表"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favoritedAgents.map((agent) => (
              <AgentShelfCard
                key={agent.id}
                agent={agent}
                onOpen={() => onOpenAgentDetail?.(agent)}
                onRun={() => onTryAgentItem?.(agent)}
              />
            ))}
          </div>
        )}
      </section>

      <section id="liked-agents" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={15} className="fill-rose-500 text-rose-500" />
            <h2 className="font-bold text-slate-900 text-base">点赞的智能体</h2>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700">
              {likedAgents.length}
            </span>
          </div>
        </div>

        {likedAgents.length === 0 ? (
          <EmptyShelf
            icon={<Heart size={16} />}
            title="暂无点赞的智能体"
            hint="在市场为喜欢的智能体点赞后，会出现在这里"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {likedAgents.map((agent) => (
              <AgentShelfCard
                key={agent.id}
                agent={agent}
                onOpen={() => onOpenAgentDetail?.(agent)}
                onRun={() => onTryAgentItem?.(agent)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">常用与最近调用的智能体</h2>
          <button
            onClick={onNavigateToHome}
            className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
          >
            去首页探索更多智能体 →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={agent.coverImage}
                    alt={agent.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-600 transition-colors">
                    {agent.title}
                  </h4>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {agent.category}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{agent.desc}</p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={11} />
                  已用 {agent.usageCount} 次
                </span>
                {onTryAgentItem && (
                  <button
                    onClick={() => onTryAgentItem(agent)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Play size={11} className="fill-emerald-600" />
                    <span>运行</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
