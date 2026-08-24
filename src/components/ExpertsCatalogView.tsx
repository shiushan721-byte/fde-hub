import React, { useState } from 'react';
import {
  Search,
  Users,
  UserRound
} from 'lucide-react';
import { FDEExpert } from '../types';
import { FDECard } from './FDECard';

interface ExpertsCatalogViewProps {
  experts: FDEExpert[];
  onSelectExpert: (expertId: string) => void;
  onConsultExpert: (expert: FDEExpert) => void;
  onToggleFavorite?: (expertId: string) => void;
  favoriteExpertIds?: string[];
  onOpenBecomeCreator?: () => void;
  onOpenMyExpertHome?: () => void;
  isExpert?: boolean;
}

export const ExpertsCatalogView: React.FC<ExpertsCatalogViewProps> = ({
  experts,
  onSelectExpert,
  onConsultExpert,
  onToggleFavorite,
  favoriteExpertIds = [],
  onOpenBecomeCreator,
  onOpenMyExpertHome,
  isExpert = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExperts = experts.filter((exp) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      exp.name.toLowerCase().includes(query) ||
      exp.title.toLowerCase().includes(query) ||
      exp.roleTag.toLowerCase().includes(query) ||
      exp.bio.toLowerCase().includes(query) ||
      exp.skills.some((s) => s.toLowerCase().includes(query)) ||
      exp.domainTags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <div id="experts-catalog-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Search Bar + 我的专家主页 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 AI 专家姓名、领域、技能或擅长方向..."
              className="w-full pl-9 pr-14 py-2.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                清空
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (isExpert) onOpenMyExpertHome?.();
              else onOpenBecomeCreator?.();
            }}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <UserRound size={14} />
            <span>{isExpert ? '我的专家主页' : '申请成为 AI 专家'}</span>
          </button>
        </div>
      </div>

      {/* Experts Grid */}
      {filteredExperts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperts.map((exp) => (
            <FDECard
              key={exp.id}
              expert={exp}
              onSelectExpert={onSelectExpert}
              onConsult={onConsultExpert}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favoriteExpertIds.includes(exp.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
          <Users size={36} className="mx-auto text-slate-300" />
          <div className="text-slate-800 font-bold text-sm">未找到符合条件的 AI 专家</div>
          <p className="text-slate-500 text-xs">可缩短搜索关键词后重试</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 cursor-pointer"
          >
            清空搜索
          </button>
        </div>
      )}
    </div>
  );
};
