import React from 'react';
import { MessageSquare, ArrowRight, Heart } from 'lucide-react';
import { FDEExpert } from '../types';

interface FDECardProps {
  expert: FDEExpert;
  onSelectExpert: (expertId: string) => void;
  onConsult: (expert: FDEExpert) => void;
  onToggleFavorite?: (expertId: string) => void;
  isFavorite?: boolean;
}

export const FDECard: React.FC<FDECardProps> = ({
  expert,
  onSelectExpert,
  onConsult,
  onToggleFavorite,
  isFavorite = false
}) => {
  return (
    <div
      id={`fde-card-${expert.id}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 p-5 overflow-hidden"
    >
      {/* Top Background subtle tint */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none" />

      {/* Header Info */}
      <div className="relative flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <img
              src={expert.avatar}
              alt={expert.name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-sm"
            />
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"
              title="当前在线可接单"
            />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
              {expert.name}
            </h3>
          </div>
        </div>

        {/* Follow button */}
        <button
          id={`btn-fav-${expert.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(expert.id);
          }}
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
            isFavorite
              ? 'text-rose-600 bg-rose-50 border-rose-200'
              : 'text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border-slate-100'
          }`}
          title={isFavorite ? '取消关注' : '关注TA'}
        >
          <Heart size={13} className={isFavorite ? 'fill-rose-500' : ''} />
          <span>{isFavorite ? '已关注' : '关注TA'}</span>
        </button>
      </div>

      {/* Featured Quote / Bio snippet */}
      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
        {expert.featuredQuote || expert.bio}
      </p>

      {/* Domain tags */}
      <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
        {expert.domainTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Bottom Actions: [查看主页] & [咨询] */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          id={`btn-view-profile-${expert.id}`}
          onClick={() => onSelectExpert(expert.id)}
          className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50/80 rounded-xl border border-slate-200/80 hover:border-blue-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>查看主页</span>
          <ArrowRight size={13} />
        </button>

        <button
          id={`btn-consult-fde-${expert.id}`}
          onClick={() => onConsult(expert)}
          className="flex-1 py-2 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-2xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <MessageSquare size={13} />
          <span>立即咨询</span>
        </button>
      </div>
    </div>
  );
};
