import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  Cpu,
  TrendingUp,
  Flame,
  CheckCircle2,
  Users,
  Briefcase,
  Play
} from 'lucide-react';
import { FDEExpert, AgentSolution } from '../types';
import { industriesList, capabilitiesList } from '../data/mockData';
import { FDECard } from './FDECard';
import { AgentSolutionCard } from './AgentSolutionCard';

interface MarketplaceHomeProps {
  experts: FDEExpert[];
  agents: AgentSolution[];
  onSelectExpert: (expertId: string) => void;
  onConsultExpert: (expert: FDEExpert) => void;
  onTryAgent: (agent: AgentSolution) => void;
  onConsultAgent: (agent: AgentSolution) => void;
  onViewAllExperts: () => void;
  onViewAllAgents: () => void;
  onToggleFavoriteExpert?: (expertId: string) => void;
  onToggleLikeAgent?: (agentId: string) => void;
  favoriteExpertIds?: string[];
  likedAgentIds?: string[];
}

export const MarketplaceHome: React.FC<MarketplaceHomeProps> = ({
  experts,
  agents,
  onSelectExpert,
  onConsultExpert,
  onTryAgent,
  onConsultAgent,
  onViewAllExperts,
  onViewAllAgents,
  onToggleFavoriteExpert,
  onToggleLikeAgent,
  favoriteExpertIds = [],
  likedAgentIds = []
}) => {
  const [selectedIndustry, setSelectedIndustry] = useState('全部行业');
  const [selectedCapability, setSelectedCapability] = useState('全部能力');
  const [heroSearchQuery, setHeroSearchQuery] = useState('');

  // Filtering
  const filteredExperts = experts.filter((exp) => {
    const matchesIndustry =
      selectedIndustry === '全部行业' ||
      exp.roleTag.includes(selectedIndustry.replace('全部', '')) ||
      exp.domainTags.some((t) => t.includes(selectedIndustry.slice(0, 2)));

    const matchesCap =
      selectedCapability === '全部能力' ||
      exp.domainTags.some((t) => t.includes(selectedCapability.slice(0, 3))) ||
      exp.skills.some((s) => s.toLowerCase().includes(selectedCapability.toLowerCase()));

    const matchesSearch =
      !heroSearchQuery ||
      exp.name.toLowerCase().includes(heroSearchQuery.toLowerCase()) ||
      exp.title.toLowerCase().includes(heroSearchQuery.toLowerCase()) ||
      exp.roleTag.toLowerCase().includes(heroSearchQuery.toLowerCase()) ||
      exp.domainTags.some((t) => t.toLowerCase().includes(heroSearchQuery.toLowerCase()));

    return matchesIndustry && matchesCap && matchesSearch;
  });

  const filteredAgents = agents.filter((agent) => {
    const matchesIndustry =
      selectedIndustry === '全部行业' ||
      agent.category.includes(selectedIndustry.replace('全部', '')) ||
      agent.tags.some((t) => t.includes(selectedIndustry.slice(0, 2)));

    const matchesSearch =
      !heroSearchQuery ||
      agent.title.toLowerCase().includes(heroSearchQuery.toLowerCase()) ||
      agent.subtitle.toLowerCase().includes(heroSearchQuery.toLowerCase()) ||
      agent.tags.some((t) => t.toLowerCase().includes(heroSearchQuery.toLowerCase()));

    return matchesIndustry && matchesSearch;
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // filtered automatically via state
  };

  return (
    <div id="marketplace-home-page" className="space-y-12 pb-20">
      {/* 1. HERO SECTION (Focused on Dual Entry: Post Demand vs Browse Agents) */}
      <section
        id="hero-section"
        className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white pt-14 pb-18 px-4 sm:px-6 lg:px-8 overflow-hidden rounded-b-3xl shadow-xl"
      >
        {/* Subtle Background Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-blue-200">
            <Sparkles size={14} className="text-amber-300 animate-pulse" />
            <span>FDE（前置部署工程师）服务市场 · 官方技术担保</span>
          </div>

          {/* Main Title */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-white leading-tight">
              找到懂你业务的 <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">AI 专家</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              直接使用标准智能体，或获得业务系统二次开发、私有化部署与长期技术维护服务
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white/95 rounded-2xl p-2 shadow-2xl backdrop-blur-md border border-white/20">
              <Search className="text-slate-400 ml-3 shrink-0" size={20} />
              <input
                id="hero-search-input"
                type="text"
                value={heroSearchQuery}
                onChange={(e) => setHeroSearchQuery(e.target.value)}
                placeholder="搜索：例如“帮我搭建电商客服智能体”、“制造工业质检”..."
                className="w-full px-3 py-2.5 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              />
              <button
                type="submit"
                id="btn-hero-search-submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1 shrink-0"
              >
                <span>智能找专家</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              id="btn-hero-browse-agents"
              onClick={() => {
                const el = document.getElementById('section-hot-agents');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-2xl border border-white/20 backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Play size={15} className="fill-white" />
              <span>浏览热门标准智能体</span>
            </button>
          </div>

          {/* Quick Stats Footnote */}
          <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span>✓ 官方认证 FDE 专家交付</span>
            <span>·</span>
            <span>✓ 资金托管按阶段结算</span>
            <span>·</span>
            <span>✓ 签署标准 SLA 协议</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* 2. FILTER SECTION (Industry & Capabilities) */}
        <section id="filter-section" className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          {/* Industry Filter Row */}
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0 mt-1 sm:mt-0">
              行业分类:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {industriesList.map((ind) => (
                <button
                  key={ind}
                  id={`filter-ind-${ind}`}
                  onClick={() => setSelectedIndustry(ind)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedIndustry === ind
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Capability Filter Row */}
          <div className="flex items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0 mt-1 sm:mt-0">
              交付能力:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {capabilitiesList.map((cap) => (
                <button
                  key={cap}
                  id={`filter-cap-${cap}`}
                  onClick={() => setSelectedCapability(cap)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedCapability === cap
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. 推荐 FDE (Featured FDE Experts) */}
        <section id="section-recommended-fde" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Award size={18} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">推荐认证 FDE</h2>
                <p className="text-xs text-slate-500">
                  真实企业落地经验背书，提供专属架构设计、驻场调试与二次开发
                </p>
              </div>
            </div>

            <button
              id="btn-view-all-experts"
              onClick={onViewAllExperts}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer hover:underline"
            >
              <span>查看全部专家 ({experts.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* FDE Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExperts.slice(0, 6).map((expert) => (
              <FDECard
                key={expert.id}
                expert={expert}
                onSelectExpert={onSelectExpert}
                onConsult={onConsultExpert}
                onToggleFavorite={onToggleFavoriteExpert}
                isFavorite={favoriteExpertIds.includes(expert.id)}
              />
            ))}
          </div>
        </section>

        {/* 4. 热门标准版智能体 (Popular Standard AI Agents) */}
        <section id="section-hot-agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Flame size={18} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">热门标准版智能体</h2>
                <p className="text-xs text-slate-500">
                  可直接查看与订阅使用，并在结果中一键咨询作者进行深度业务二次开发
                </p>
              </div>
            </div>

            <button
              id="btn-view-all-agents"
              onClick={onViewAllAgents}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer hover:underline"
            >
              <span>查看全部智能体 ({agents.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <AgentSolutionCard
                key={agent.id}
                agent={agent}
                onTryAgent={onTryAgent}
                onConsultCustomization={onConsultAgent}
                onSelectAuthor={onSelectExpert}
                onToggleLike={onToggleLikeAgent}
                isLiked={likedAgentIds.includes(agent.id)}
              />
            ))}
          </div>
        </section>

        {/* 5. 平台全流程服务交付与保障链路 (Platform Delivery & Security) */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              TRUST & SECURITY
            </span>
            <h3 className="text-2xl font-bold font-display">
              严苛的 FDE 准入与平台四重交付保障
            </h3>
            <p className="text-xs text-slate-300">
              杜绝“套壳与无法落地的 PPT”，让每一次企业 AI 投入都有据可循、有保底收益
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: '1. 实名与落地案例背书',
                desc: '专家均通过身份实名核验与大厂/工业标杆案例技术代码审核。'
              },
              {
                title: '2. 资金平台分阶段托管',
                desc: '预付款存入平台担保账户，按「需求→原型→上线」分步验收放款。'
              },
              {
                title: '3. 标准 SLA 与源码移交',
                desc: '自动签署具有法律效力的保密协议 (NDA) 与源代码所有权移交条款。'
              },
              {
                title: '4. 官方仲裁与售后质保',
                desc: '30 天免费 Bug 修复保障，交付争议由平台评审专家组介入裁决。'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2"
              >
                <div className="text-sm font-bold text-blue-200">{item.title}</div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
