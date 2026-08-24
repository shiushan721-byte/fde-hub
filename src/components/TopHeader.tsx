import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Bell,
  ChevronRight,
  Home,
  User,
  Bookmark,
  ShieldCheck,
  Award,
  ChevronDown,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Star,
  Crown
} from 'lucide-react';
import { MainNavRoute } from './Sidebar';
import { CreatorTierLevel, RealNameVerifyStatus, FDECertStatus, UserIdentityRole } from '../types/creator';
import { isExpertRole } from '../utils/expertIdentity';

interface TopHeaderProps {
  currentRoute: MainNavRoute | 'author-profile';
  onNavigate: (route: MainNavRoute) => void;
  onOpenRechargeModal: () => void;
  currentTier?: CreatorTierLevel;
  activeAuthorName?: string | null;
  onBackToHome?: () => void;
  unreadCount?: number;
  favoriteAgentCount?: number;
  favoriteExpertCount?: number;
  onOpenFavorites?: (tab: 'agents' | 'experts') => void;
  onOpenConsultationDrawer?: () => void;
  onOpenBecomeCreator?: () => void;
  onOpenBecomeFDE?: () => void;
  isCreator?: boolean;
  realNameStatus?: RealNameVerifyStatus;
  fdeCertStatus?: FDECertStatus;
  userRole?: UserIdentityRole;
  onToggleUserRole?: (role: UserIdentityRole) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentRoute,
  onNavigate,
  onOpenRechargeModal,
  currentTier = 1 as CreatorTierLevel,
  activeAuthorName,
  onBackToHome,
  unreadCount = 0,
  favoriteAgentCount = 0,
  favoriteExpertCount = 0,
  onOpenFavorites,
  onOpenConsultationDrawer,
  onOpenBecomeCreator,
  onOpenBecomeFDE,
  isCreator = false,
  realNameStatus = 'verified',
  fdeCertStatus = 'certified',
  userRole = 'normal',
  onToggleUserRole
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isExpert = isExpertRole(userRole);

  return (
    <header
      id="top-header"
      className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between transition-all"
    >
      {/* Left Breadcrumb & Route Context */}
      <div className="flex items-center gap-3">
        {currentRoute === 'author-profile' ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={onBackToHome || (() => onNavigate('hellome-home'))}
              className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Home size={13} />
              <span>首页</span>
            </button>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-900 font-bold flex items-center gap-1.5">
              <User size={13} className="text-blue-600" />
              <span>AI 专家主页</span>
              {activeAuthorName && <span className="text-blue-600 font-extrabold">· {activeAuthorName}</span>}
            </span>
          </div>
        ) : currentRoute === 'hellome-home' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              应用智能体交易平台 · 懂业务的 AI 专家
            </span>
          </div>
        ) : currentRoute === 'creator-center' ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onNavigate('hellome-home')}
              className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Home size={13} />
              <span>首页</span>
            </button>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-blue-700 font-bold flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              <span>AI 专家中心 · 经营与认证体系</span>
            </span>
          </div>
        ) : currentRoute === 'fde-intro' ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onNavigate('hellome-home')}
              className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Home size={13} />
              <span>首页</span>
            </button>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-900 font-bold">专家入驻 · 申请成为 AI 专家</span>
          </div>
        ) : currentRoute === 'fde-experts' ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onNavigate('hellome-home')}
              className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Home size={13} />
              <span>首页</span>
            </button>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-900 font-bold">
              AI 专家库 · 真人实名专业开发者网络
            </span>
          </div>
        ) : currentRoute === 'favorites' ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onNavigate('hellome-home')}
              className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Home size={13} />
              <span>首页</span>
            </button>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-amber-600 font-bold flex items-center gap-1.5">
              <Bookmark size={13} className="fill-amber-500 text-amber-500" />
              <span>我的收藏 / 关注</span>
            </span>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-700">
            {currentRoute === 'workspace' && '我的智能体'}
            {currentRoute === 'orders' && '我的定制'}
            {currentRoute === 'account' && '账户总览 · 词元充值与流水'}
            {currentRoute === 'apikey' && 'API Key 管理中心'}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Entry Point based on 2 Subjects */}
        {!isExpert ? (
          <button
            id="btn-top-become-creator"
            onClick={onOpenBecomeCreator}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 animate-pulse"
          >
            <Sparkles size={13} />
            <span>申请成为 AI 专家</span>
          </button>
        ) : null}

        {/* 充值按钮 */}
        <button
          id="btn-top-recharge"
          onClick={onOpenRechargeModal}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-200"
        >
          <Plus size={13} strokeWidth={3} />
          <span>充值</span>
        </button>

        {/* Message Drawer button */}
        {onOpenConsultationDrawer && (
          <button
            onClick={onOpenConsultationDrawer}
            title="消息提醒"
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors relative cursor-pointer"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>
        )}

        {/* User Profile Avatar with Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            id="user-avatar-menu-trigger"
            className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer ring-2 ring-slate-200 hover:ring-blue-400"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
              <img
                src={
                  !isExpert
                    ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    : currentTier === 3
                    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                }
                alt="用户头像"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <ChevronDown size={12} className="text-slate-500 mr-0.5" />
          </button>

          {/* User Profile Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              {/* User Identity Header */}
              <div className="px-4 pb-3 border-b border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {!isExpert ? '普通用户 (138****8000)' : '林然 (Ray Lin)'}
                  </span>
                  {!isExpert ? (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                      普通用户
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center gap-1">
                      <Award size={10} className="text-blue-600" />
                      <span>AI 专家</span>
                    </span>
                  )}
                </div>

                {!isExpert ? (
                  <p className="text-[11px] text-slate-500 leading-tight">
                    免实名认证，可免费浏览与体验智能体，消耗官方词元。
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-600 leading-tight">
                    公安实名认证 · 享独立专家主页与作品经营能力。
                  </p>
                )}
              </div>

              <div className="py-2 px-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFavorites?.('agents');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left font-bold text-slate-800 hover:bg-amber-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Bookmark size={15} className="text-amber-500 fill-amber-100" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>我的收藏</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-bold border border-amber-100">
                      {favoriteAgentCount}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFavorites?.('experts');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left font-bold text-slate-800 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Star size={15} className="text-blue-500" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>我的关注</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-bold border border-blue-100">
                      {favoriteExpertCount}
                    </span>
                  </div>
                </button>

                {!isExpert && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onOpenBecomeCreator) onOpenBecomeCreator();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserPlus size={15} className="text-blue-600" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>申请成为 AI 专家</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-normal">
                        去认证
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <div className="px-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center justify-between mb-1.5 text-slate-600 font-semibold">
                  <span>主体模拟切换:</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleUserRole) onToggleUserRole('normal');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                      !isExpert
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    普通用户
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleUserRole) onToggleUserRole('expert');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                      isExpert
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    AI 专家
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
