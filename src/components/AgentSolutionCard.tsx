import React from 'react';
import { Play, Heart, Bookmark, MessageSquare, ArrowUpRight, Sparkles, Star, User } from 'lucide-react';
import { AgentSolution } from '../types';
import { FDEBadge } from './FDEBadge';

interface AgentSolutionCardProps {
  agent: AgentSolution;
  onTryAgent: (agent: AgentSolution) => void;
  onConsultCustomization: (agent: AgentSolution) => void;
  onSelectAuthor: (authorId: string) => void;
  onToggleLike?: (agentId: string) => void;
  isLiked?: boolean;
  onToggleFavorite?: (agentId: string) => void;
  isFavorite?: boolean;
}

export const AgentSolutionCard: React.FC<AgentSolutionCardProps> = ({
  agent,
  onTryAgent,
  onConsultCustomization,
  onSelectAuthor,
  onToggleLike,
  isLiked = false,
  onToggleFavorite,
  isFavorite = false
}) => {
  return (
    <div
      id={`agent-card-${agent.id}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden"
    >
      {/* Cover Image Container with Hover Quick Actions */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-900">
        <img
          src={agent.coverImage}
          alt={agent.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
        />
        {/* Gradient Overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

        {/* Category & Rating Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[75%]">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-slate-800 shadow-xs">
            {agent.category}
          </span>
          {agent.pricingPlans?.isFree || agent.price === 0 ? (
            <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-600/90 backdrop-blur-md text-white flex items-center gap-1 shadow-xs">
              <span>免费开源</span>
            </span>
          ) : (
            <span
              className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 backdrop-blur-md text-white flex items-center gap-1 shadow-xs"
              title="支持按月订阅、按年优惠与终身买断制"
            >
              <span>￥{agent.pricingPlans?.monthlyPrice || agent.price || 29}/月起</span>
            </span>
          )}
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-900/80 backdrop-blur-md text-amber-300 flex items-center gap-1">
            <Star size={11} className="fill-amber-300 text-amber-300" />
            <span>{agent.rating.toFixed(1)}</span>
          </span>
        </div>

        {/* Action Buttons on Top Right (收藏 & 点赞) */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              id={`btn-fav-${agent.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleFavorite(agent.id);
              }}
              className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-md active:scale-90 group/fav ${
                isFavorite
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400/40'
                  : 'bg-black/50 hover:bg-amber-500 text-slate-100 hover:text-white border-white/30 hover:border-amber-400'
              }`}
              title={isFavorite ? '已收藏，点击取消' : '点击收藏此智能体'}
            >
              <Bookmark
                size={14}
                className={`transition-transform duration-200 group-hover/fav:scale-115 ${
                  isFavorite ? 'fill-white text-white' : ''
                }`}
              />
            </button>
          )}

          {onToggleLike && (
            <button
              id={`btn-like-${agent.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleLike(agent.id);
              }}
              className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-md active:scale-90 ${
                isLiked
                  ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                  : 'bg-black/50 text-white hover:bg-rose-500 border-white/30 hover:border-rose-400'
              }`}
              title={isLiked ? '已点赞' : '点赞'}
            >
              <Heart size={14} className={isLiked ? 'fill-white' : ''} />
            </button>
          )}
        </div>

        {/* Floating Fast Action Buttons on Cover Hover */}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <button
            id={`btn-view-agent-${agent.id}`}
            onClick={() => onTryAgent(agent)}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/30 transition-all cursor-pointer transform active:scale-95"
          >
            <Sparkles size={13} className="text-white" />
            <span>查看详情</span>
          </button>

          <button
            id={`btn-consult-custom-${agent.id}`}
            onClick={() => onConsultCustomization(agent)}
            className="py-2 px-3 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-medium text-xs flex items-center justify-center gap-1 shadow-md backdrop-blur-md transition-all cursor-pointer"
            title="咨询作者进行系统对接或定制二次开发"
          >
            <MessageSquare size={13} className="text-blue-600" />
            <span>二次开发</span>
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4.5 flex-1 flex flex-col">
        {/* Title */}
        <h3
          onClick={() => onTryAgent(agent)}
          className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer"
          title={agent.title}
        >
          {agent.title}
        </h3>

        {/* Subtitle / Description */}
        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
          {agent.subtitle || agent.description}
        </p>

        {/* Feature Tags */}
        <div className="flex flex-wrap gap-1 mt-3 mb-4">
          {agent.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Author Footnote with Badge & Stats */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Author link */}
          <button
            id={`btn-author-${agent.id}`}
            onClick={() => onSelectAuthor(agent.authorId)}
            className="flex items-center gap-2 group/author text-left cursor-pointer hover:opacity-80 transition-opacity"
            title={`查看 ${agent.authorName} 的 FDE 主页`}
          >
            <img
              src={agent.authorAvatar}
              alt={agent.authorName}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800 group-hover/author:text-blue-600">
                {agent.authorName}
              </span>
              <FDEBadge type={agent.authorVerifyType} label={agent.authorVerifyLabel} size="sm" />
            </div>
          </button>

          {/* Social Proof */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-0.5">
              <Heart size={11} className="text-rose-400 fill-rose-400" />
              <span>{agent.likesCount + (isLiked ? 1 : 0)}</span>
            </span>
            <span>·</span>
            <span>{agent.usesCount > 1000 ? `${(agent.usesCount / 1000).toFixed(1)}k` : agent.usesCount} 次调用</span>
          </div>
        </div>
      </div>
    </div>
  );
};
