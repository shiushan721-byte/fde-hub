import React from 'react';
import {
  Home,
  Award,
  Sparkles,
  LayoutDashboard,
  ClipboardList,
  Wallet,
  Key,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Zap,
  Users,
  Star,
  Crown
} from 'lucide-react';
import { UserIdentityRole } from '../types/creator';
import { isExpertRole } from '../utils/expertIdentity';

export type MainNavRoute =
  | 'hellome-home'
  | 'workspace'
  | 'orders'
  | 'fde-experts'
  | 'creator-center'
  | 'favorites'
  | 'account'
  | 'apikey'
  | 'fde-intro';

interface SidebarProps {
  currentRoute: MainNavRoute;
  onNavigate: (route: MainNavRoute) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  fdeExpertCount?: number;
  favoritesCount?: number;
  onOpenBecomeCreator?: () => void;
  onOpenBecomeFDE?: () => void;
  currentTier?: 1 | 2 | 3;
  currentRole?: UserIdentityRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  fdeExpertCount = 6,
  favoritesCount = 0,
  onOpenBecomeCreator,
  onOpenBecomeFDE,
  currentTier = 1,
  currentRole = 'normal'
}) => {
  const isExpert = isExpertRole(currentRole);

  const menuItems: {
    key: MainNavRoute;
    label: string;
    icon: React.ElementType;
    badge?: string;
    isHighlight?: boolean;
  }[] = [
    {
      key: 'hellome-home',
      label: '智能体市场',
      icon: Home
    },
    {
      key: 'workspace',
      label: '我的智能体',
      icon: LayoutDashboard
    },
    {
      key: 'orders',
      label: '订单中心',
      icon: ClipboardList
    },
    {
      key: 'fde-experts',
      label: 'AI 专家库',
      icon: Users
    }
  ];

  return (
    <aside
      id="hellome-sidebar"
      className={`fixed top-0 left-0 bottom-0 z-40 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-all duration-300 select-none ${
        collapsed ? 'w-18' : 'w-56'
      }`}
    >
      {/* Top Header / Brand Logo */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          {!collapsed ? (
            <button
              onClick={() => onNavigate('hellome-home')}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              {/* Hellome Brand Icon */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <span className="font-extrabold tracking-tighter">H</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-black tracking-tight text-white font-display">
                  Hell<span className="text-emerald-400">o</span>me
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('hellome-home')}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-emerald-500/20 mx-auto cursor-pointer"
            >
              <span>H</span>
            </button>
          )}

          <button
            id="btn-toggle-sidebar"
            onClick={onToggleCollapse}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.key;
            return (
              <button
                key={item.key}
                id={`sidebar-nav-${item.key}`}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                  isActive
                    ? item.isHighlight
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : item.isHighlight
                    ? 'text-blue-300 hover:bg-slate-800/80 hover:text-blue-200'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon
                    size={18}
                    className={`${
                      isActive
                        ? 'text-white'
                        : item.isHighlight
                        ? 'text-blue-400 group-hover:scale-110 transition-transform'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {item.isHighlight && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  )}
                </div>

                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate tracking-wide">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Tooltip on collapsed hover */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 text-white text-[11px] rounded-lg shadow-xl border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                    {item.label}
                    {item.badge && ` · ${item.badge}`}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="p-3 border-t border-slate-800/80 space-y-2.5">
        {/* Identity Status */}
        {!collapsed ? (
          <div
            onClick={() => {
              onNavigate(!isExpert ? 'fde-intro' : 'creator-center');
            }}
            className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all space-y-1 group ${
              !isExpert
                ? 'bg-gradient-to-r from-slate-800 to-slate-750 border-slate-700 text-slate-300 hover:bg-slate-750'
                : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-400/40 text-blue-200 hover:bg-slate-800/90'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-white">
              <span className="flex items-center gap-1">
                <Award size={13} className={!isExpert ? 'text-slate-400' : 'text-blue-400'} />
                <span>{!isExpert ? '申请成为 AI 专家' : 'AI 专家'}</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                  !isExpert ? 'bg-blue-600 text-white' : 'bg-blue-400 text-slate-950'
                }`}
              >
                {!isExpert ? '入驻申请' : '已认证'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 group-hover:text-slate-300">
              {!isExpert ? '完成实名核验与入驻审核' : '管理作品、咨询与专家主页'}
            </p>
          </div>
        ) : (
          <button
            onClick={() => {
              onNavigate(!isExpert ? 'fde-intro' : 'creator-center');
            }}
            title={!isExpert ? '申请成为 AI 专家' : 'AI 专家'}
            className={`w-10 h-10 mx-auto rounded-xl border flex items-center justify-center cursor-pointer hover:scale-105 transition-transform ${
              !isExpert
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-blue-500/20 border-blue-400/40 text-blue-300'
            }`}
          >
            <Award size={18} />
          </button>
        )}

        {/* Connection Status */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/50 text-[11px] text-slate-400 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            {!collapsed && <span className="truncate">已连接 AI 工作站</span>}
          </div>
          {!collapsed && <ChevronDown size={14} className="text-slate-500 shrink-0" />}
        </div>
      </div>
    </aside>
  );
};
