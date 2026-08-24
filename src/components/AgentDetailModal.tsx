import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Heart,
  Bookmark,
  ArrowRight,
  Share2,
  Layers,
  Check,
  CheckCircle,
  Play
} from 'lucide-react';
import { HellomeAgentItem } from '../data/mockData';
import { FDEBadge } from './FDEBadge';
import { mockExperts } from '../data/mockData';
import { getStandardVersionForAgent } from '../data/agentInstanceMockData';

interface AgentDetailModalProps {
  agent: HellomeAgentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthorProfile: (authorId: string) => void;
  onConsultAuthor?: (agent: HellomeAgentItem, initialPrompt?: string) => void;
  onCustomizeFromAgent?: (agent: HellomeAgentItem) => void;
  onUseAgent?: (agent: HellomeAgentItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (agentId: string) => void;
  isLiked?: boolean;
  onToggleLike?: (agentId: string) => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  isOpen,
  onClose,
  onOpenAuthorProfile,
  onConsultAuthor,
  onCustomizeFromAgent,
  onUseAgent,
  isFavorite = false,
  onToggleFavorite,
  isLiked = false,
  onToggleLike
}) => {
  if (!isOpen || !agent) return null;

  const [copiedLink, setCopiedLink] = useState(false);

  const authorExpert = mockExperts.find((e) => e.id === agent.authorId) || mockExperts[0];
  const standardVersion = getStandardVersionForAgent(agent.id);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      id="agent-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="agent-detail-modal-card"
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Hero Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shrink-0 overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close & Share Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors cursor-pointer"
              title="分享智能体"
            >
              {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors cursor-pointer"
              title="关闭详情"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-0">
            {/* Agent Cover Image */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-xl shrink-0 bg-slate-800">
              <img
                src={agent.coverImage}
                alt={agent.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Agent Title & Stats */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {agent.category}
                </span>
                {agent.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {agent.badge}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {agent.title}
              </h1>

              {/* Author & Action buttons */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                {/* Clickable Author Name */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthorProfile(agent.authorId || 'fde-linran');
                  }}
                  className="flex items-center gap-2 hover:text-blue-300 transition-colors bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md cursor-pointer group"
                >
                  <img
                    src={authorExpert.avatar}
                    alt={authorExpert.name}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-semibold">{agent.authorName || authorExpert.name}</span>
                  <FDEBadge type={authorExpert.verifyType} label={authorExpert.verifyLabel} size="sm" />
                  <span className="text-[10px] text-blue-300 opacity-80 group-hover:underline">
                    进入主页 &gt;
                  </span>
                </button>

                {/* Like Button */}
                {onToggleLike && (
                  <button
                    type="button"
                    onClick={() => onToggleLike(agent.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                      isLiked
                        ? 'bg-rose-500/30 text-rose-300 border-rose-400/50'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                    }`}
                  >
                    <Heart size={13} className={isLiked ? 'fill-rose-400 text-rose-400' : ''} />
                    <span>点赞 {agent.likesCount}</span>
                  </button>
                )}

                {/* Bookmark Favorite Button */}
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(agent.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                      isFavorite
                        ? 'bg-amber-500/30 text-amber-300 border-amber-400/50'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                    }`}
                  >
                    <Bookmark size={13} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
                    <span>{isFavorite ? '已收藏' : `收藏 ${agent.favoritesCount}`}</span>
                  </button>
                )}
              </div>
            </div>

            {onUseAgent && (
              <button
                type="button"
                onClick={() => onUseAgent(agent)}
                className="shrink-0 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Play size={15} className="fill-white" />
                <span>立即使用</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center shrink-0">
          <div className="flex items-center gap-8 text-sm font-bold">
            <div className="py-3.5 border-b-2 border-blue-600 text-blue-600 flex items-center gap-2">
              <Sparkles size={16} />
              <span>智能体介绍与配置</span>
            </div>
          </div>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="space-y-6 max-w-3xl mx-auto">
              {/* Core Description Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <span>应用简介与核心价值</span>
                </h3>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {agent.desc}
                </p>
              </div>

              {/* Feature Highlights Matrix */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" />
                  <span>核心能力与特性矩阵</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span>全自动意图理解与自愈</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      多轮对话上下文精准保持，自动提取业务实体并匹配最优 SOP。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span>结构化工作流与知识库</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      支持向量图谱检索与 RAG 召回，杜绝大模型幻觉，保障业务准确性。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span>多端多系统 API 对接</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      支持企业微信、飞书、钉钉、Web挂件及 ERP/OMS 系统的 Webhook 打通。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span>私有化与信创环境兼容</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      提供源码交付、本地离线一体机部署，确保核心业务数据 0 泄露。
                    </p>
                  </div>
                </div>
              </div>

              {/* 通用智能体 · 标准版信息 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    当前标准版 <span className="text-blue-600">{standardVersion}</span>
                  </p>
                </div>
                {agent.canFDECustom !== false && (
                  <button
                    id="btn-customize-from-agent"
                    onClick={() => {
                      if (onCustomizeFromAgent) {
                        onCustomizeFromAgent(agent);
                      } else if (onConsultAuthor) {
                        onConsultAuthor(agent);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>基于此智能体定制</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};
