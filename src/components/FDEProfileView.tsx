import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Play,
  Sparkles,
  Layers,
  Share2,
  Copy,
  Check,
  QrCode
} from 'lucide-react';
import { FDEExpert, AgentSolution, CaseStudy, getCaseStudyImages } from '../types';
import { FDEBadge } from './FDEBadge';

interface FDEProfileViewProps {
  expert: FDEExpert;
  agentSolutions: AgentSolution[];
  caseStudies?: CaseStudy[];
  onBack: () => void;
  onConsult: (expert: FDEExpert, initialPrompt?: string) => void;
  onTryAgent: (agent: AgentSolution) => void;
  onConsultAgent: (agent: AgentSolution) => void;
  onToggleFavorite?: (expertId: string) => void;
  isFavorite?: boolean;
  favoriteAgentIds?: string[];
  onToggleFavoriteAgent?: (agentId: string) => void;
}

export const FDEProfileView: React.FC<FDEProfileViewProps> = ({
  expert,
  agentSolutions,
  caseStudies = [],
  onBack,
  onConsult,
  onTryAgent,
  onConsultAgent,
  onToggleFavorite,
  isFavorite = false,
  favoriteAgentIds = [],
  onToggleFavoriteAgent
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  // Filter items authored by or assigned to this expert
  const expertSolutions = agentSolutions.filter((a) => a.authorId === expert.id);
  const displaySolutions = expertSolutions;
  const displayCases = caseStudies.filter((c) => c.expertId === expert.id);

  // Aggregate engagement across this expert's agents
  const totalLikes = displaySolutions.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
  const totalFavorites = displaySolutions.reduce(
    (acc, curr) => acc + (curr.favoritesCount ?? 0),
    0
  );

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/#expert/${expert.id}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };


  return (
    <div id="creator-public-profile-page" className="min-h-screen bg-slate-50/70 pb-24">
      {/* Top Header & Breadcrumb */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <button
            id="btn-back-to-catalog"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} />
            <span>返回 AI 专家库</span>
          </button>

          <div className="flex items-center gap-2.5">
            {/* Share profile button */}
            <button
              id="btn-share-profile"
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="分享 AI 专家主页"
            >
              <Share2 size={14} className="text-slate-500" />
              <span>分享主页</span>
            </button>

            {/* Favorite Creator */}
            <button
              id="btn-profile-fav"
              onClick={() => onToggleFavorite?.(expert.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFavorite
                  ? 'text-rose-600 bg-rose-50 border-rose-200'
                  : 'text-slate-700 hover:text-rose-600 bg-white border-slate-200'
              }`}
            >
              <Heart size={14} className={isFavorite ? 'fill-rose-600' : ''} />
              <span>{isFavorite ? '已关注' : '关注TA'}</span>
            </button>

            {/* Primary CTA: Consult Creator */}
            <button
              id="btn-profile-consult-header"
              onClick={() => onConsult(expert)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <MessageSquare size={14} />
              <span>咨询 AI 专家</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Main Hero Card: Profile Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8 relative overflow-hidden">
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={expert.avatar}
                  alt={expert.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-100 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" title="当前在线可接咨询" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {expert.name}
                  </h1>
                  <FDEBadge type={expert.verifyType} label={expert.verifyLabel} size="md" />
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/60">
                    {expert.roleTag}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1.5">{expert.title}</p>

                {/* Domain tags */}
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {expert.domainTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Consultation CTA Box */}
            <div className="w-full md:w-auto flex flex-col items-stretch sm:items-end gap-2.5 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-500 block">智能体服务模式</span>
                <span className="text-sm font-bold text-slate-900">支持在线体验 · 咨询与定制合作</span>
              </div>
              <button
                onClick={() => onConsult(expert)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>咨询创作者</span>
              </button>
            </div>
          </div>

          {/* About Me snippet */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              <span>关于创作者</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
              {expert.bio}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-xs text-slate-500 block">已发布免费智能体</span>
              <span className="text-lg font-black text-blue-600 mt-0.5 block">{displaySolutions.length} 个</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-xs text-slate-500 block">全部点赞数</span>
              <span className="text-lg font-black text-indigo-600 mt-0.5 block">{totalLikes.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-xs text-slate-500 block">全部收藏数</span>
              <span className="text-lg font-black text-rose-600 mt-0.5 block">{totalFavorites.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <Layers size={16} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">作品智能体 ({displaySolutions.length})</h2>
        </div>

        <div className="space-y-6">
            {displaySolutions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displaySolutions.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={agent.coverImage}
                          alt={agent.title}
                          className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100"
                        />
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            免费运行
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1 line-clamp-1">{agent.title}</h4>
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleFavoriteAgent?.(agent.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          favoriteAgentIds.includes(agent.id)
                            ? 'text-rose-500 bg-rose-50 border-rose-200'
                            : 'text-slate-400 hover:text-rose-500 bg-slate-50 border-slate-100'
                        }`}
                        title="收藏智能体"
                      >
                        <Heart size={14} className={favoriteAgentIds.includes(agent.id) ? 'fill-rose-500' : ''} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{agent.description}</p>

                    {/* Capabilities Tags */}
                    <div className="flex flex-wrap gap-1">
                      {agent.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Area */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onTryAgent(agent)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Play size={12} className="fill-white" />
                        <span>立即试运行</span>
                      </button>
                      <button
                        onClick={() => onConsultAgent(agent)}
                        className="w-full py-2 px-3 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MessageSquare size={12} />
                        <span>咨询定制</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
                <Layers size={28} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">暂无已发布智能体</p>
                <p className="text-xs text-slate-500">该专家尚未发布 Hermes 可运行作品，可直接发起项目咨询</p>
              </div>
            )}
        </div>

        {displayCases.length > 0 && (
          <div className="mt-10 space-y-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">落地案例 ({displayCases.length})</h2>
            </div>
            <div className="space-y-5">
              {displayCases.map((c) => {
                const imgs = getCaseStudyImages(c);
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                            {c.clientIndustry}
                          </span>
                          <span className="text-xs text-slate-500">服务对象：{c.clientName}</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1.5">{c.title}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onConsult(expert, `想了解您在案例「${c.title}」中的落地实现与交付方案`)
                        }
                        className="px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200/60 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        <MessageSquare size={13} />
                        <span>咨询同款方案</span>
                      </button>
                    </div>

                    {imgs.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {imgs.map((url, idx) => (
                          <button
                            key={`${c.id}-img-${idx}`}
                            type="button"
                            onClick={() =>
                              setPreviewImage({ url, label: `${c.title} · 图 ${idx + 1}` })
                            }
                            className="shrink-0 w-36 sm:w-44 aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group"
                          >
                            <img
                              src={url}
                              alt={`${c.title} ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 space-y-1">
                        <span className="font-bold text-rose-900">业务痛点</span>
                        <p className="text-rose-950 leading-relaxed">{c.challenge}</p>
                      </div>
                      <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1">
                        <span className="font-bold text-blue-900">解决方案</span>
                        <p className="text-blue-950 leading-relaxed">{c.solution}</p>
                      </div>
                      <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                        <span className="font-bold text-emerald-900">产出与 ROI</span>
                        <div className="grid grid-cols-2 gap-2">
                          {c.roiMetrics.map((m, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-2 rounded-xl border border-emerald-200 text-center"
                            >
                              <span className="text-sm font-extrabold text-emerald-700 block">
                                {m.value}
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">{m.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-4 max-w-3xl w-full space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 truncate">{previewImage.label}</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.label}
              referrerPolicy="no-referrer"
              className="w-full rounded-xl border border-slate-100 bg-slate-50"
            />
          </div>
        </div>
      )}

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">分享创作者公开主页</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
              <img
                src={expert.avatar}
                alt={expert.name}
                className="w-16 h-16 rounded-2xl mx-auto object-cover ring-2 ring-blue-500"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{expert.name}</h4>
                <p className="text-xs text-slate-500">{expert.title}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 inline-block shadow-2xs">
                <QrCode size={100} className="text-slate-800" />
                <span className="text-[10px] text-slate-400 block mt-1">微信扫码直接访问作品主页</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700">主页专属链接</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/#expert/${expert.id}`}
                  className="w-full px-3 py-2 bg-slate-100 text-xs text-slate-700 rounded-xl font-mono border border-slate-200 outline-none"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? '已复制' : '复制'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
