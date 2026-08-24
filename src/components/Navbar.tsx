import React from 'react';
import { Cpu, Search, MessageSquare, Briefcase } from 'lucide-react';

interface NavbarProps {
  currentTab: 'market' | 'experts';
  onSelectTab: (tab: 'market' | 'experts') => void;
  onOpenConsultationDrawer: () => void;
  unreadCount?: number;
  onOpenBecomeFDEModal: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenConsultationDrawer,
  unreadCount = 2,
  onOpenBecomeFDEModal,
  searchQuery,
  onSearchChange,
  onSearchSubmit
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit(searchQuery);
    }
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-8 shrink-0">
            <button
              id="btn-logo-home"
              onClick={() => onSelectTab('market')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <Cpu size={22} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900 font-display">FDE Hub</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                    服务市场
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 -mt-0.5">懂业务的 AI 交付与服务平台</span>
              </div>
            </button>

            {/* Navigation tabs */}
            <nav id="nav-main-links" className="hidden md:flex items-center gap-1">
              <button
                id="nav-tab-market"
                onClick={() => onSelectTab('market')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentTab === 'market'
                    ? 'text-blue-600 bg-blue-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                智能体市场
              </button>
              <button
                id="nav-tab-experts"
                onClick={() => onSelectTab('experts')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentTab === 'experts'
                    ? 'text-blue-600 bg-blue-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                FDE 专家
              </button>
            </nav>
          </div>

          {/* Quick Search */}
          <div className="flex-1 max-w-md hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="navbar-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索智能体方案、FDE 专家或行业（如：电商客服、离线质检）..."
                className="w-full pl-9 pr-20 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
              <button
                id="btn-navbar-search"
                onClick={() => onSearchSubmit(searchQuery)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5">
            {/* My Consultations */}
            <button
              id="btn-nav-consultations"
              onClick={onOpenConsultationDrawer}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="我的咨询与需求工单"
            >
              <MessageSquare size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Become FDE */}
            <button
              id="btn-nav-become-fde"
              onClick={onOpenBecomeFDEModal}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl border border-slate-200/80 hover:border-blue-200 transition-all cursor-pointer"
            >
              <Briefcase size={14} className="text-slate-500" />
              <span>成为 FDE</span>
            </button>

            {/* User Profile */}
            <div className="flex items-center pl-1 border-l border-slate-200">
              <div
                id="user-avatar-btn"
                className="w-8 h-8 rounded-full ring-2 ring-slate-100 bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center text-xs font-semibold cursor-pointer shadow-xs"
                title="企业用户已登录"
              >
                企业
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
