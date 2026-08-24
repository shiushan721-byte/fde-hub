import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  User,
  Heart,
  Search,
  ArrowRight,
  Trash2,
  Sparkles,
  ShieldCheck,
  Star,
  ExternalLink,
  MessageCircle,
  Clock,
  Compass
} from 'lucide-react';
import { HellomeAgentItem } from '../data/mockData';
import { FDEExpert } from '../types';

interface FavoritesViewProps {
  favoriteAgentIds: string[];
  favoriteExpertIds: string[];
  allAgents: HellomeAgentItem[];
  allExperts: FDEExpert[];
  onToggleFavoriteAgent: (agentId: string) => void;
  onToggleFavoriteExpert: (expertId: string) => void;
  onOpenAuthorProfile: (authorId: string) => void;
  onOpenAgentDetail?: (agent: HellomeAgentItem) => void;
  likedAgentIds?: string[];
  onToggleLikeAgent?: (agentId: string) => void;
  onConsultExpert: (expert: FDEExpert) => void;
  onNavigateToHome: () => void;
  initialTab?: 'agents' | 'experts';
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favoriteAgentIds,
  favoriteExpertIds,
  allAgents,
  allExperts,
  onToggleFavoriteAgent,
  onToggleFavoriteExpert,
  onOpenAuthorProfile,
  onOpenAgentDetail,
  likedAgentIds = [],
  onToggleLikeAgent,
  onConsultExpert,
  onNavigateToHome,
  initialTab = 'agents'
}) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'experts'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');

  // Favorited lists
  const favoritedAgents = allAgents.filter((agent) => favoriteAgentIds.includes(agent.id));
  const favoritedExperts = allExperts.filter((expert) => favoriteExpertIds.includes(expert.id));

  // Filtered by search query
  const filteredAgents = favoritedAgents.filter(
    (a) =>
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.authorName && a.authorName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredExperts = favoritedExperts.filter(
    (e) =>
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.domainTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="favorites-view" className="space-y-6 pb-16">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Bookmark size={20} className="fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {activeTab === 'agents' ? '我的收藏' : '我的关注'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {activeTab === 'agents' ? '管理您收藏的智能体' : '管理您关注的 AI 专家'}
                </p>
              </div>
            </div>
          </div>

          {/* Stat Badges */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-2">
              <span className="text-slate-500">已收藏智能体:</span>
              <span className="text-emerald-600 font-bold text-sm">{favoritedAgents.length}</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-2">
              <span className="text-slate-500">已关注专家:</span>
              <span className="text-blue-600 font-bold text-sm">{favoritedExperts.length}</span>
            </div>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Tab buttons */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              id="tab-favorite-agents"
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'agents'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={14} className={activeTab === 'agents' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>收藏的智能体</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  activeTab === 'agents' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {favoritedAgents.length}
              </span>
            </button>

            <button
              id="tab-favorite-experts"
              onClick={() => setActiveTab('experts')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'experts'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User size={14} className={activeTab === 'experts' ? 'text-blue-600' : 'text-slate-400'} />
              <span>关注的专家</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  activeTab === 'experts' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {favoritedExperts.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'agents' ? '搜索收藏的智能体...' : '搜索关注的专家...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:border-amber-500 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. TAB 1: 收藏的智能体 */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          {filteredAgents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Bookmark size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery ? '没有找到匹配的收藏智能体' : '暂无收藏的智能体'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  在首页浏览应用智能体时，点击卡片右上角的书签图标即可一键收藏。
                </p>
              </div>
              <button
                onClick={onNavigateToHome}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Compass size={14} />
                <span>前往首页发现智能体</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredAgents.map((agent) => {
                const authorId = agent.authorId || 'fde-linran';
                const isLiked = likedAgentIds.includes(agent.id);

                return (
                  <div
                    key={agent.id}
                    id={`favorited-agent-card-${agent.id}`}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-2xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col relative cursor-pointer"
                    onClick={() => {
                      if (onOpenAgentDetail) onOpenAgentDetail(agent);
                      else onOpenAuthorProfile(authorId);
                    }}
                  >
                    {/* Card Cover Banner */}
                    <div className="relative h-36 overflow-hidden bg-slate-100">
                      <img
                        src={agent.coverImage}
                        alt={agent.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80" />

                      {agent.badge && (
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white tracking-wide border border-white/20">
                          {agent.badge}
                        </div>
                      )}

                      {/* Remove Favorite Button */}
                      <div className="absolute top-2 right-2 z-30">
                        <button
                          type="button"
                          id={`btn-remove-fav-${agent.id}`}
                          title="点击取消收藏此智能体"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onToggleFavoriteAgent(agent.id);
                          }}
                          className="w-9 h-9 rounded-full bg-black/60 hover:bg-rose-600 backdrop-blur-md text-amber-300 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer border border-white/20 hover:border-rose-400 shadow-md active:scale-90 group/fav"
                        >
                          <Bookmark size={15} className="fill-amber-400 text-amber-400 group-hover/fav:text-white group-hover/fav:fill-white transition-transform group-hover/fav:scale-115" />
                        </button>
                      </div>

                      {/* Hover Indicator: View Agent Detail */}
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-4 py-2 bg-white text-slate-950 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transform scale-95 group-hover:scale-100 transition-transform">
                          <Sparkles size={13} className="text-blue-600" />
                          <span>查看智能体介绍</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                          {agent.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {agent.desc}
                        </p>
                      </div>

                      {/* Card Footer: author link & stats (独立点赞 / 收藏 / 评论) */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAuthorProfile(authorId);
                          }}
                          className="flex items-center gap-1.5 text-blue-600 font-semibold text-[11px] truncate max-w-[40%] hover:underline cursor-pointer group/author"
                          title={`进入作者「${agent.authorName || '官方认证'}」的主页`}
                        >
                          <User size={12} className="text-blue-500 shrink-0 group-hover/author:scale-110 transition-transform" />
                          <span className="truncate">{agent.authorName || '官方认证'}</span>
                        </button>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-medium shrink-0">
                          {/* 点赞 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleLikeAgent) onToggleLikeAgent(agent.id);
                            }}
                            className={`flex items-center gap-1 transition-colors cursor-pointer ${
                              isLiked
                                ? 'text-rose-600 font-semibold'
                                : 'hover:text-rose-500 text-slate-500'
                            }`}
                            title={isLiked ? '已点赞，点击取消' : '点赞'}
                          >
                            <Heart
                              size={11}
                              className={
                                isLiked
                                  ? 'fill-rose-500 text-rose-500 scale-110 transition-transform'
                                  : 'text-slate-400 group-hover:text-rose-500'
                              }
                            />
                            <span>{agent.likesCount || '1.2k'}</span>
                          </button>

                          {/* 收藏 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavoriteAgent(agent.id);
                            }}
                            className="flex items-center gap-1 text-amber-600 font-semibold hover:text-rose-600 transition-colors cursor-pointer"
                            title="已收藏，点击取消"
                          >
                            <Bookmark size={11} className="fill-amber-500 text-amber-500" />
                            <span>{agent.favoritesCount || '860'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. TAB 2: 关注的专家 */}
      {activeTab === 'experts' && (
        <div className="space-y-4">
          {filteredExperts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <User size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery ? '没有找到匹配的关注专家' : '暂无关注的专家'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  在专家卡片或主页点击「关注TA」，即可在此随时查看其最新作品并发起咨询。
                </p>
              </div>
              <button
                onClick={onNavigateToHome}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Compass size={14} />
                <span>前往专家库</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredExperts.map((expert) => {
                return (
                  <div
                    key={expert.id}
                    id={`favorited-expert-card-${expert.id}`}
                    className="group bg-white rounded-3xl border border-slate-200 hover:border-blue-400 p-6 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Top Row: Avatar + Title + Favorite Toggle */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-blue-500/20 group-hover:ring-blue-500 bg-slate-100 shrink-0 cursor-pointer"
                          onClick={() => onOpenAuthorProfile(expert.id)}
                        >
                          <img
                            src={expert.avatar}
                            alt={expert.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3
                              onClick={() => onOpenAuthorProfile(expert.id)}
                              className="text-base font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                            >
                              {expert.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold flex items-center gap-1 border border-blue-200">
                              <ShieldCheck size={11} className="text-blue-600" />
                              <span>{expert.verifyLabel}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{expert.title}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                              <Star size={11} className="fill-amber-400" />
                              {expert.rating} 分
                            </span>
                            <span>· 交付 {expert.ordersCount} 单</span>
                            <span>· 复购率 {expert.stats.repeatRate}</span>
                          </p>
                        </div>
                      </div>

                      {/* Cancel Favorite Button */}
                      <button
                        title="取消关注"
                        onClick={() => onToggleFavoriteExpert(expert.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Heart size={12} className="fill-rose-500 text-rose-500" />
                        <span>已关注</span>
                      </button>
                    </div>

                    {/* Bio & Domain tags */}
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-xl">
                        "{expert.bio}"
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {expert.domainTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        <span>平均响应: {expert.responseTime}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onConsultExpert(expert)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MessageCircle size={13} />
                          <span>咨询方案</span>
                        </button>
                        <button
                          onClick={() => onOpenAuthorProfile(expert.id)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <span>查看主页与作品</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
