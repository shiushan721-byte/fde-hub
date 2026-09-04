import React, { useEffect, useState } from 'react';
import {
  Search,
  Sparkles,
  ArrowRight,
  User,
  Heart,
  Bookmark,
  Lightbulb,
  Loader2
} from 'lucide-react';
import {
  mockHellomeHomeAgents,
  HellomeAgentItem
} from '../data/mockData';
import { defaultHomeBanners, defaultHomeCategories, HomeBannerItem } from '../../shared/homeDefaults';
import { INSPIRATION_HOME_CATEGORIES } from '../../shared/inspirationCategories';
import { pricingFromAgent, pricingLabel } from '../../shared/pricingPlans';
import { api } from '../lib/api';
import { getMockPublicInspirations, type PublicInspiration } from '../lib/inspiration';
import { InspirationFeed } from './InspirationFeed';
import { AgentRecommendModal, type AgentRecommendItem } from './AgentRecommendModal';

interface HellomeHomeViewProps {
  onOpenAuthorProfile: (authorId: string) => void;
  onOpenAgentDetail: (agent: HellomeAgentItem) => void;
  onOpenInspiration?: (item: PublicInspiration) => void;
  initialCatalogueTab?: 'agents' | 'inspiration';
  onNavigateToCreatorCenter?: () => void;
  favoriteAgentIds?: string[];
  onToggleFavoriteAgent?: (agentId: string) => void;
  likedAgentIds?: string[];
  onToggleLikeAgent?: (agentId: string) => void;
  agents?: HellomeAgentItem[];
  banners?: HomeBannerItem[];
  categories?: string[];
  sectionTitle?: string;
  creatorCountLabel?: string;
}

function platformSupportLabel(support?: HellomeAgentItem['platformSupport']) {
  switch (support) {
    case 'mac':
      return '适配 macOS';
    case 'windows':
      return '适配 Windows';
    case 'both':
    default:
      return '适配macOS和Windows';
  }
}

const RECOMMEND_EXAMPLES = [
  '帮我给新茶饮出三套主视觉 KV',
  '写一篇能被 AI 搜索引用的选购长文',
  '临时要一份上会请示，连夜出稿'
];

export const HellomeHomeView: React.FC<HellomeHomeViewProps> = ({
  onOpenAuthorProfile,
  onOpenAgentDetail,
  onOpenInspiration,
  initialCatalogueTab = 'agents',
  onNavigateToCreatorCenter,
  favoriteAgentIds = [],
  onToggleFavoriteAgent,
  likedAgentIds = [],
  onToggleLikeAgent,
  agents,
  banners,
  categories,
  sectionTitle = '热门智能体',
  creatorCountLabel = '已入驻 100+ 认证创作者与工作室'
}) => {
  const catalogAgents = agents ?? mockHellomeHomeAgents;
  const homeBanners = banners ?? defaultHomeBanners;
  const agentCategories = categories ?? defaultHomeCategories;
  const bannerBySlot = (slot: HomeBannerItem['slot']) =>
    homeBanners.find((b) => b.slot === slot && b.visible);
  const mainBanner = bannerBySlot('main');
  const experienceBanner = bannerBySlot('experience');
  const creatorBanner = bannerBySlot('creator');

  // Category & search state for 热门智能体
  const [catalogueTab, setCatalogueTab] = useState<'agents' | 'inspiration'>(initialCatalogueTab);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [recommendBusy, setRecommendBusy] = useState(false);
  const [recommendError, setRecommendError] = useState('');
  const [recommendQuery, setRecommendQuery] = useState('');
  const [recommendSummary, setRecommendSummary] = useState('');
  const [recommendIntents, setRecommendIntents] = useState<string[]>([]);
  const [recommendItems, setRecommendItems] = useState<AgentRecommendItem[]>([]);
  const [recommendSource, setRecommendSource] = useState<'ai' | 'local'>('local');
  const [inspirations, setInspirations] = useState<PublicInspiration[]>([]);
  const [inspirationsLoading, setInspirationsLoading] = useState(false);

  useEffect(() => {
    setCatalogueTab(initialCatalogueTab);
    setSelectedCategory('全部');
  }, [initialCatalogueTab]);

  useEffect(() => {
    let cancelled = false;
    setInspirationsLoading(true);
    void api<{ items: PublicInspiration[] }>('/api/public/inspirations')
      .then((res) => {
        if (cancelled) return;
        const items = res.items || [];
        setInspirations(items.length > 0 ? items : getMockPublicInspirations());
      })
      .catch(() => {
        if (!cancelled) setInspirations(getMockPublicInspirations());
      })
      .finally(() => {
        if (!cancelled) setInspirationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredInspirations = inspirations.filter((item) => {
    const matchesCat =
      selectedCategory === '全部' || item.inspireCategory === selectedCategory;
    const q = agentSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.agent.title.toLowerCase().includes(q) ||
      item.user.name.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const filteredAgents = catalogAgents.filter((item) => {
    const matchesCat = selectedCategory === '全部' || item.category === selectedCategory;
    return matchesCat;
  });

  const submitAgentRecommend = async (raw?: string) => {
    const query = (raw ?? agentSearchQuery).trim() || RECOMMEND_EXAMPLES[0];
    setAgentSearchQuery(query);
    setRecommendQuery(query);
    setRecommendOpen(true);
    setRecommendBusy(true);
    setRecommendError('');
    setRecommendItems([]);
    setRecommendSummary('');
    setRecommendIntents([]);
    try {
      const result = await api<{
        source: 'ai' | 'local';
        analysis: { summary: string; intents: string[] };
        items: AgentRecommendItem[];
      }>('/api/public/agents/recommend', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      const hydrated = (result.items || []).map((item) => {
        const local = catalogAgents.find((agent) => agent.id === item.id);
        return {
          ...(local || item),
          reason: item.reason,
          matchScore: item.matchScore
        };
      });
      setRecommendItems(hydrated);
      setRecommendSummary(result.analysis?.summary || '');
      setRecommendIntents(result.analysis?.intents || []);
      setRecommendSource(result.source || 'local');
    } catch (err) {
      setRecommendError(err instanceof Error ? err.message : '推荐失败，请稍后重试');
    } finally {
      setRecommendBusy(false);
    }
  };

  return (
    <div id="hellome-home-page" className="space-y-8 pb-16">
      {/* 1. TOP 3-BANNER CAROUSEL STRIP (Hero area) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Banner 1: Main Platform Banner (spans 6 cols on lg) */}
        {mainBanner && (
        <div
          id="banner-main-hellome"
          className="lg:col-span-6 relative rounded-3xl overflow-hidden bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-200 p-7 sm:p-8 flex flex-col justify-between min-h-[220px] shadow-sm group"
        >
          {/* Subtle background illustration shapes */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
          <div className="absolute -right-8 -bottom-8 w-56 h-56 rounded-full bg-gradient-to-tr from-amber-400/40 to-emerald-400/30 blur-2xl pointer-events-none" />

          {/* Decorative 3D Character Elements */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-90 group-hover:scale-105 transition-transform duration-300">
            <div className="w-24 sm:w-32 h-24 sm:h-32 rounded-3xl bg-gradient-to-tr from-orange-500 via-amber-400 to-yellow-300 shadow-xl flex flex-col items-center justify-center p-3 text-white transform rotate-3 border-2 border-white/40">
              <span className="text-3xl sm:text-4xl">🤖</span>
              <span className="text-[10px] font-black tracking-wider uppercase mt-1 bg-black/30 px-2 py-0.5 rounded-full">
                AI HUB
              </span>
            </div>
            <div className="hidden sm:flex flex-col gap-2">
              <div className="px-3 py-1 bg-white/90 text-slate-900 text-xs font-bold rounded-xl shadow-md transform -rotate-6">
                💬 创作者生态
              </div>
              <div className="px-3 py-1 bg-slate-900 text-amber-300 text-xs font-bold rounded-xl shadow-md transform rotate-3">
                ⚡ 优质主页
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-3 max-w-[65%] sm:max-w-[70%]">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight font-display flex items-center">
                Hell<span className="text-emerald-700">o</span>me
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                {mainBanner.eyebrow}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
              {mainBanner.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-800/90 font-medium leading-relaxed">
              {mainBanner.subtitle}
            </p>
          </div>

          <div className="relative z-10 pt-4 flex items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('home-catalogue-bar');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{mainBanner.ctaLabel}</span>
              <ArrowRight size={13} />
            </button>
            <span className="text-xs text-slate-800 font-semibold flex items-center gap-1">
              <Sparkles size={13} className="text-amber-600" />
              {creatorCountLabel}
            </span>
          </div>
        </div>
        )}

        {experienceBanner && (
        <div
          id="banner-sub-experience"
          className="lg:col-span-3 relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 p-6 flex flex-col justify-between min-h-[220px] shadow-sm border border-amber-300/40 group cursor-pointer"
          onClick={() => {
            const el = document.getElementById('home-catalogue-bar');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="space-y-2 relative z-10">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider bg-amber-300/80 px-2 py-0.5 rounded-md">
              ⚡ {experienceBanner.eyebrow}
            </span>
            <h3 className="text-lg font-black text-amber-950 leading-tight">
              {experienceBanner.title}
            </h3>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              {experienceBanner.subtitle}
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-4">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
              <span>{experienceBanner.ctaLabel}</span>
              <ArrowRight size={14} />
            </span>
            <div className="w-12 h-12 rounded-2xl bg-amber-400/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🚀
            </div>
          </div>
        </div>
        )}

        {creatorBanner && (
        <div
          id="banner-sub-future"
          className="lg:col-span-3 relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 text-white p-6 flex flex-col justify-between min-h-[220px] shadow-sm group cursor-pointer"
          onClick={() => {
            if (onNavigateToCreatorCenter) onNavigateToCreatorCenter();
          }}
        >
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                💰 {creatorBanner.eyebrow}
              </span>
            </div>
            <h3 className="text-lg font-black text-white leading-tight">
              {creatorBanner.title}
            </h3>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              {creatorBanner.subtitle}
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-4">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1 group-hover:underline">
              <span>{creatorBanner.ctaLabel}</span>
              <ArrowRight size={14} />
            </span>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              💎
            </div>
          </div>
        </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. THE MAIN SECTION HEADER BAR: [热门智能体] & 分类标签与搜索 */}
      {/* ========================================================================= */}
      <section id="home-catalogue-bar" className="space-y-4 pt-2">
        {/* Main Header Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: 热门智能体 / 发现灵感 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="tab-section-hot-agents"
                onClick={() => {
                  setCatalogueTab('agents');
                  setSelectedCategory('全部');
                }}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm cursor-pointer ${
                  catalogueTab === 'agents'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles
                  size={17}
                  className={catalogueTab === 'agents' ? 'text-emerald-400' : 'text-slate-400'}
                />
                <span>{sectionTitle}</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    catalogueTab === 'agents' ? 'bg-white/20 text-emerald-300' : 'bg-white text-slate-500'
                  }`}
                >
                  {catalogAgents.length}+
                </span>
              </button>
              <button
                type="button"
                id="tab-section-inspiration"
                onClick={() => {
                  setCatalogueTab('inspiration');
                  setSelectedCategory('全部');
                }}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm cursor-pointer ${
                  catalogueTab === 'inspiration'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Lightbulb
                  size={17}
                  className={catalogueTab === 'inspiration' ? 'text-amber-300' : 'text-slate-400'}
                />
                <span>发现灵感</span>
                {inspirations.length > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      catalogueTab === 'inspiration'
                        ? 'bg-white/20 text-amber-200'
                        : 'bg-white text-slate-500'
                    }`}
                  >
                    {inspirations.length}
                  </span>
                )}
              </button>
            </div>

            {/* Right: Search Input */}
            <div className="flex items-center justify-end gap-3 px-2 w-full md:w-auto">
              <div className={`relative w-full ${catalogueTab === 'agents' ? 'md:w-[28rem]' : 'md:w-72'}`}>
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter' && catalogueTab === 'agents') {
                      e.preventDefault();
                      void submitAgentRecommend();
                    }
                  }}
                  placeholder={
                    catalogueTab === 'inspiration'
                      ? '搜索成果、作者或智能体...'
                      : '用一句话描述你想做什么…'
                  }
                  className={`w-full pl-9 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white outline-none transition-all ${
                    catalogueTab === 'agents' ? 'pr-20' : 'pr-3'
                  }`}
                />
                {catalogueTab === 'agents' && (
                  <button
                    type="button"
                    disabled={recommendBusy}
                    onClick={() => void submitAgentRecommend()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {recommendBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    匹配
                  </button>
                )}
              </div>
            </div>
          </div>
          {catalogueTab === 'agents' && (
            <div className="px-2 pt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 shrink-0">试试：</span>
              {RECOMMEND_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={recommendBusy}
                  onClick={() => void submitAgentRecommend(example)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-[11px] text-slate-600 hover:text-emerald-700 cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          )}

          {/* Sub-bar for Agents: Category Filter Pills */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">分类:</span>
            {(catalogueTab === 'inspiration' ? INSPIRATION_HOME_CATEGORIES : agentCategories).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? catalogueTab === 'inspiration'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {catalogueTab === 'agents' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>共展示 {filteredAgents.length} 款应用智能体</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredAgents.map((agent) => {
              const authorId = agent.authorId || 'fde-linran';
              const isLiked = likedAgentIds.includes(agent.id);
              const isFavorited = favoriteAgentIds.includes(agent.id);
              const pricing = pricingFromAgent(agent);
              const priceText = pricingLabel(pricing);

              return (
                <div
                  key={agent.id}
                  id={`agent-card-${agent.id}`}
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 shadow-2xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                  onClick={() => onOpenAgentDetail(agent)}
                >
                  {/* Card Banner Cover Illustration */}
                  <div className="relative h-36 overflow-hidden bg-slate-100">
                    <img
                      src={agent.coverImage}
                      alt={agent.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Banner overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80" />

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <div className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white tracking-wide border border-white/20">
                        {platformSupportLabel(agent.platformSupport)}
                      </div>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 z-20">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${
                          pricing.isFree
                            ? 'bg-emerald-500/95 text-white border-emerald-300/40'
                            : 'bg-white/95 text-slate-900 border-white/60'
                        }`}
                      >
                        {priceText}
                      </span>
                    </div>

                    {/* Bookmark Favorite Button (卡片右上角独立收藏区域) */}
                    {onToggleFavoriteAgent && (
                      <div className="absolute top-2 right-2 z-30">
                        <button
                          type="button"
                          id={`btn-fav-card-${agent.id}`}
                          title={isFavorited ? '已收藏此智能体，点击取消' : '点击收藏此智能体'}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onToggleFavoriteAgent(agent.id);
                          }}
                          className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-md active:scale-90 group/fav ${
                            isFavorited
                              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400/40 scale-105'
                              : 'bg-black/50 hover:bg-amber-500 text-slate-100 hover:text-white border-white/30 hover:border-amber-400 hover:scale-105'
                          }`}
                        >
                          <Bookmark
                            size={15}
                            className={`transition-transform duration-200 group-hover/fav:scale-115 ${
                              isFavorited ? 'fill-white text-white' : ''
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Hover indicator: Enter Agent Detail / Introduction */}
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                      <span className="px-4 py-2 bg-white text-slate-950 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transform scale-95 group-hover:scale-100 transition-transform">
                        <Sparkles size={13} className="text-blue-600" />
                        <span>查看智能体介绍</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                          {agent.title}
                        </h3>
                        <span
                          className={`shrink-0 text-[11px] font-bold ${
                            pricing.isFree ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {priceText}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {agent.desc}
                      </p>
                    </div>

                    {/* Card Footer: author link & stats (点赞 / 收藏) */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      {/* 点击作者名字进入主页 */}
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

                      {/* 独立互动区：点赞 / 收藏 */}
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-medium shrink-0">
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

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleFavoriteAgent) onToggleFavoriteAgent(agent.id);
                          }}
                          className={`flex items-center gap-1 transition-colors cursor-pointer ${
                            isFavorited
                              ? 'text-amber-600 font-semibold'
                              : 'hover:text-amber-500 text-slate-500'
                          }`}
                          title={isFavorited ? '已收藏，点击取消' : '收藏'}
                        >
                          <Bookmark
                            size={11}
                            className={
                              isFavorited
                                ? 'fill-amber-500 text-amber-500 scale-110 transition-transform'
                                : 'text-slate-400 group-hover:text-amber-500'
                            }
                          />
                          <span>{agent.favoritesCount || '860'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>共展示 {filteredInspirations.length} 条推荐成果</span>
          </div>
          <InspirationFeed
            items={filteredInspirations}
            loading={inspirationsLoading}
            onOpen={(item) => onOpenInspiration?.(item)}
          />
        </div>
        )}
      </section>

      {/* 3. Bottom Footer Legal info */}
      <footer className="pt-12 text-center text-[11px] text-slate-400 space-y-1 border-t border-slate-200">
        <div>
          © 2026 江苏汇智能数字科技有限公司 · 苏ICP备2023021414号-14 · 苏公网安备32011402012641号
        </div>
        <div>
          大模型备案号：Jiangsu-CarrotAI-202407030002 · 懂业务的 AI 智能体应用平台
        </div>
      </footer>

      {recommendOpen && (
        <AgentRecommendModal
          query={recommendQuery}
          loading={recommendBusy}
          error={recommendError}
          summary={recommendSummary}
          intents={recommendIntents}
          items={recommendItems}
          source={recommendSource}
          onClose={() => setRecommendOpen(false)}
          onOpenAgent={(agent) => {
            setRecommendOpen(false);
            onOpenAgentDetail(agent);
          }}
          onOpenAuthor={(authorId) => {
            setRecommendOpen(false);
            onOpenAuthorProfile(authorId);
          }}
        />
      )}
    </div>
  );
};
