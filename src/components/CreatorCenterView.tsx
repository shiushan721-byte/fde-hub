import React, { useState, useEffect } from 'react';
import {
  Home,
  Bot,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Heart,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCode2,
  ExternalLink,
  Search,
  Filter,
  Package,
  Building2,
  Cpu,
  Lock,
  Unlock,
  Boxes,
  Share2,
  Copy,
  Check,
  AlertCircle,
  QrCode,
  Trash2,
  Edit3,
  Upload,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Bookmark,
  ThumbsUp,
  Crown,
  ArrowLeft
} from 'lucide-react';
import {
  CreatorTierLevel,
  CreatorAgentItem,
  CustomerLeadItem,
  RealNameVerifyStatus,
  FDECertStatus,
  FDE_CERT_DISCLAIMER,
  UserIdentityRole
} from '../types/creator';
import {
  initialCreatorProfile,
  mockCreatorAgentsList,
  mockCustomerLeads,
  creatorDatasetsByTier
} from '../data/creatorMockData';
import { AgentPublishWizardModal } from './AgentPublishWizardModal';
import { CustomerInstancesPanel } from './CustomerInstancesPanel';
import { CreatorCustomOrdersPanel } from './CustomOrderPanels';
import { mockCustomerAgentInstances } from '../data/agentInstanceMockData';
import { CustomerAgentInstance } from '../types/creator';
import { isExpertRole } from '../utils/expertIdentity';

function platformSupportLabel(support: CreatorAgentItem['platformSupport']) {
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

function platformSupportBadgeClass(support: CreatorAgentItem['platformSupport']) {
  switch (support) {
    case 'mac':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'windows':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'both':
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

export type CreatorCenterTab =
  | 'profile-editor'   // 1. 主页编辑
  | 'my-agents'        // 2. 智能体管理（含通用 / 专属子 Tab）
  | 'custom-services'  // 3. 定制服务（咨询 + 订单同一流程）
  | 'customer-leads'   // 兼容旧入口：映射到定制服务
  | 'orders'           // 兼容旧入口：映射到定制服务
  | 'customer-instances' // 兼容旧入口：映射到智能体管理 · 专属
  | 'realname-verify'; // 兼容旧入口：打开实名弹窗

type AgentMgmtSubTab = 'universal' | 'private';

interface CreatorCenterViewProps {
  onOpenOnboardingModal: () => void;
  onOpenBecomeFDE?: () => void;
  onNavigateToFDE: () => void;
  currentTier?: CreatorTierLevel;
  onSelectTier?: (tier: CreatorTierLevel) => void;
  initialTab?: CreatorCenterTab;
  userRole?: UserIdentityRole;
  /** 本会话内从专家/智能体咨询表单新提交的线索 */
  sessionLeads?: CustomerLeadItem[];
  /** 从外部入口进入时提供返回 */
  onBack?: () => void;
  backLabel?: string;
}

export const CreatorCenterView: React.FC<CreatorCenterViewProps> = ({
  onOpenOnboardingModal,
  onOpenBecomeFDE,
  onNavigateToFDE,
  currentTier = 3 as CreatorTierLevel,
  onSelectTier,
  initialTab = 'my-agents',
  userRole = 'expert',
  sessionLeads = [],
  onBack,
  backLabel = '返回'
}) => {
  const [activeTab, setActiveTab] = useState<CreatorCenterTab>(() => {
    if (initialTab === 'realname-verify' || initialTab === 'customer-instances') return 'my-agents';
    if (initialTab === 'customer-leads' || initialTab === 'orders') return 'custom-services';
    return initialTab;
  });
  const [agentMgmtSubTab, setAgentMgmtSubTab] = useState<AgentMgmtSubTab>(
    initialTab === 'customer-instances' ? 'private' : 'universal'
  );
  const [showRealNameModal, setShowRealNameModal] = useState(initialTab === 'realname-verify');

  useEffect(() => {
    if (initialTab === 'realname-verify') {
      setActiveTab('my-agents');
      setShowRealNameModal(true);
      return;
    }
    if (initialTab === 'customer-instances') {
      setActiveTab('my-agents');
      setAgentMgmtSubTab('private');
      return;
    }
    if (initialTab === 'customer-leads' || initialTab === 'orders') {
      setActiveTab('custom-services');
      return;
    }
    setActiveTab(initialTab);
  }, [initialTab]);

  // 4.2 创作者实名认证 7 种状态: 'unverified' | 'in_progress' | 'verified' | 'failed' | 'manual_review' | 'expired' | 'revoked'
  const [verifyStatus, setVerifyStatus] = useState<RealNameVerifyStatus>('verified');
  const [rejectReason, setRejectReason] = useState<string>('身份证照片边缘有反光遮挡，或人脸活体检测光线不足，请在光线明亮处重新核验。');
  const [idCardName, setIdCardName] = useState<string>('林然');
  const [idCardNumber, setIdCardNumber] = useState<string>('440301199408******');
  const [phoneMasked, setPhoneMasked] = useState<string>('138****8000');

  // 5. FDE 认证逻辑体系状态机: 'not_eligible' | 'eligible_pending_confirm' | 'certified' | 'suspended' | 'revoked'
  const [accountStatus, setAccountStatus] = useState<'normal' | 'investigating' | 'banned'>('normal');
  const [agreedFdeRules, setAgreedFdeRules] = useState<boolean>(true);
  const [fdeManualOverride, setFdeManualOverride] = useState<FDECertStatus | 'auto'>('auto');
  const [suspensionReason, setSuspensionReason] = useState<'last_agent_offline' | 'hermes_incompatible' | 'realname_expired' | 'consultation_closed' | 'under_investigation'>('last_agent_offline');
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(7);

  // Creator Profile State (主页编辑)
  const [profileData, setProfileData] = useState({
    name: '林然 (Ray Lin)',
    expertNo: 'AI-EXP-000001',
    title: '跨境出海 & 电商营销 AI 架构师',
    bio: '原跨境独角兽 AI 团队负责人，8 年企业架构落地经验。专注 Hermes 隔离沙箱下的自动化智能体工作流交付，已累计为 140+ 品牌搭建营销与私域 Agent。',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    location: '深圳 / 远程支持',
    responseTime: '< 2 小时响应',
    domainTags: ['跨境电商', '爆款文案', '广告投放', '多语种本地化', '私有化部署']
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Agents State (我的智能体)
  const [agentsList, setAgentsList] = useState<CreatorAgentItem[]>(() => mockCreatorAgentsList);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [agentForSkillReplacement, setAgentForSkillReplacement] = useState<CreatorAgentItem | null>(null);
  const [instanceForSkillReplacement, setInstanceForSkillReplacement] =
    useState<CustomerAgentInstance | null>(null);

  const buildAgentFromInstance = (instance: CustomerAgentInstance): CreatorAgentItem => {
    const baseAgent = agentsList.find((a) => a.id === instance.baseAgentId);
    return {
      id: instance.id,
      title: instance.title,
      desc: baseAgent?.desc || `客户专属实例 · ${instance.customerCompany}`,
      category: baseAgent?.category || '客户专属',
      coverImage:
        baseAgent?.coverImage ||
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
      pricingType: 'paid',
      tokenRebateEnabled: false,
      fdeCustomEnabled: false,
      status: 'offline',
      version: instance.boundSkillVersion,
      skillPackage: {
        fileName: `${instance.boundSkillVersion}.zip`,
        size: '—',
        version: instance.boundSkillVersion,
        hermesCompatibility: 'Hermes-Core v2.4.1 (Stable)',
        lastValidatedAt: instance.updatedAt
      },
      viewsCount: 0,
      likesCount: 0,
      favoritesCount: 0,
      paidOrdersCount: 0,
      tokensConsumed: 0,
      totalRevenue: 0,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt
    };
  };

  // Leads State（专属实例面板仍会用到）
  const [leadsList, setLeadsList] = useState<CustomerLeadItem[]>(() => mockCustomerLeads);

  useEffect(() => {
    if (!sessionLeads.length) return;
    setLeadsList((prev) => {
      const sessionIds = new Set(sessionLeads.map((l) => l.id));
      const rest = prev.filter((l) => !sessionIds.has(l.id));
      const merged = sessionLeads.map((incoming) => {
        const existing = prev.find((l) => l.id === incoming.id);
        if (!existing) return incoming;
        return { ...existing, ...incoming };
      });
      return [...merged, ...rest];
    });
  }, [sessionLeads]);

  // 客户专属实例
  const [instancesList, setInstancesList] = useState<CustomerAgentInstance[]>(
    () => mockCustomerAgentInstances
  );

  const [certOrg, setCertOrg] = useState('中国计算机学会 CCF 架构师认证 / Hermes 认证开发者');

  // Handle Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3000);
  };

  // Handle Toggle Agent Status (Publish / Unpublish)
  const handleToggleAgentStatus = (agentId: string, targetStatus: 'published' | 'offline') => {
    if (verifyStatus !== 'verified' && targetStatus === 'published') {
      alert('⚠️ 无法发布：您尚未通过实名认证。请先完成实名认证后方可全网发布智能体。');
      setShowRealNameModal(true);
      return;
    }
    setAgentsList((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: targetStatus, updatedAt: '刚刚' } : a))
    );
  };

  return (
    <div id="creator-center-view" className="space-y-6 pb-20">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </button>
      )}

      {/* Top Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={profileData.avatar}
              alt={profileData.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500 shadow-sm"
            />
            {verifyStatus === 'verified' && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white" title="已实名认证">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {profileData.name} · AI 专家中心
              </h1>
              {verifyStatus === 'in_progress' || verifyStatus === 'manual_review' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1">
                  <Clock size={13} />
                  <span>实名审核中</span>
                </span>
              ) : verifyStatus !== 'verified' && !(isExpertRole(userRole)) ? (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1">
                  <AlertCircle size={13} />
                  <span>未实名认证 (受限模式)</span>
                </span>
              ) : null}
            </div>
            {profileData.expertNo && (
              <p className="text-xs font-mono text-slate-500 mt-1">{profileData.expertNo}</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setShowRealNameModal(true)}
            className="px-3 py-2 rounded-xl bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200 flex items-center gap-1.5 shrink-0 cursor-pointer hover:bg-blue-100 transition-colors"
            title="查看实名认证详情"
          >
            <Award size={13} className="text-blue-700" />
            <span>
              {verifyStatus === 'verified'
                ? '已实名认证'
                : verifyStatus === 'in_progress' || verifyStatus === 'manual_review'
                  ? '实名认证审核中'
                  : '实名认证'}
            </span>
          </button>

          <button
            onClick={() => {
              if (verifyStatus !== 'verified') {
                alert('⚠️ 无法发布：您尚未通过实名认证。请先完成实名认证。');
                setShowRealNameModal(true);
                return;
              }
              setAgentForSkillReplacement(null);
              setInstanceForSkillReplacement(null);
              setShowPublishModal(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <Upload size={14} />
            <span>发布智能体</span>
          </button>
        </div>
      </div>

      {/* Verification Constraint Warning Alert (if not verified) */}
      {verifyStatus !== 'verified' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              账号状态提示：当前账号处于【{verifyStatus === 'under_review' ? '审核中' : verifyStatus === 'rejected' ? '已驳回' : '未实名'}】状态
            </span>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              未实名认证前，您可以自由编辑主页草稿、上传 Skill 包并执行沙箱校验；在<strong>实名认证审核通过后</strong>，您的公开主页即可对外可见，智能体全网发布并接收客户咨询。
            </p>
            <button
              onClick={() => setShowRealNameModal(true)}
              className="mt-1 text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
            >
              前往提交 / 查看实名认证进度 →
            </button>
          </div>
        </div>
      )}

      {/* 4-Module Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { key: 'profile-editor', label: '1. 主页编辑', icon: Edit3, count: null },
          { key: 'my-agents', label: '2. 智能体管理', icon: Bot, count: agentsList.length + instancesList.length },
          { key: 'custom-services', label: '3. 定制服务', icon: Package, count: leadsList.filter((l) => l.status === 'new').length, badgeColor: 'bg-rose-500 text-white' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as CreatorCenterTab)}
              className={`flex-1 min-w-[130px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  tab.badgeColor || (isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700')
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* MODULE 1: 主页编辑 (Profile, Bio, Domain Tags)    */}
      {/* ========================================================= */}
      {activeTab === 'profile-editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">创作者基础资料与简介</h3>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  保存个人资料
                </button>
              </div>

              {profileSavedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={15} />
                  <span>主页基础资料与擅长领域已成功保存并同步！</span>
                </div>
              )}

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">创作者姓名 / 昵称</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">专家头衔</label>
                <input
                  type="text"
                  value={profileData.title}
                  onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                  placeholder="如：电商 AI 解决方案架构师"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">关于我 (个人简介 & 实战经验)</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Domain Tags Editor */}
              <div className="space-y-2 text-xs">
                <label className="font-bold text-slate-700">擅长领域与技术标签 (最多 6 个)</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {profileData.domainTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setProfileData({
                            ...profileData,
                            domainTags: profileData.domainTags.filter((t) => t !== tag)
                          })
                        }
                        className="hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {profileData.domainTags.length < 6 && (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="新增标签 (回车添加)"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newTagInput.trim() && !profileData.domainTags.includes(newTagInput.trim())) {
                              setProfileData({
                                ...profileData,
                                domainTags: [...profileData.domainTags, newTagInput.trim()]
                              });
                              setNewTagInput('');
                            }
                          }
                        }}
                        className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right 1 Col: Public Profile Preview Card */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-24">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">公开主页分享卡片预览</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-center">
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="w-16 h-16 rounded-2xl mx-auto object-cover ring-2 ring-blue-500"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{profileData.name}</h4>
                  {profileData.title && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{profileData.title}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {profileData.domainTags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={onNavigateToFDE}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye size={14} />
                <span>访问我的公开主页完整视图</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE 2: 智能体管理（通用 / 专属）                          */}
      {/* ========================================================= */}
      {activeTab === 'my-agents' && (
        <div className="space-y-6">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
            {[
              { key: 'universal' as const, label: '通用智能体管理', count: agentsList.length },
              { key: 'private' as const, label: '专属智能体管理', count: instancesList.length }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAgentMgmtSubTab(tab.key)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  agentMgmtSubTab === tab.key
                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    agentMgmtSubTab === tab.key ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {agentMgmtSubTab === 'universal' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">已维护的智能体列表 ({agentsList.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agentsList.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.coverImage || 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&auto=format&fit=crop&q=80'}
                        alt={agent.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&auto=format&fit=crop&q=80';
                        }}
                        className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-100 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{agent.title}</h4>
                        <span
                          className={`inline-flex mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${platformSupportBadgeClass(agent.platformSupport)}`}
                        >
                          {platformSupportLabel(agent.platformSupport)}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            v{agent.version || '1.0.0'}
                          </span>
                          {agent.status !== 'published' && (
                            <span className="text-[10px] text-slate-400">· 已下架 / 草稿</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{agent.desc}</p>

                  {/* 收藏 · 点赞 统计框 */}
                  <div className="py-2 px-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5" title="收藏数">
                      <Bookmark size={13} className="text-amber-500 fill-amber-50" />
                      <span className="text-slate-500 text-[11px]">收藏:</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {(agent.favoritesCount ?? (agent.id === 'agent_ecommerce_cs' ? 1240 : agent.id === 'agent_geo_helper' ? 3890 : agent.id === 'agent_doc_emergency' ? 5120 : 6)).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div className="flex items-center gap-1.5" title="点赞数">
                      <ThumbsUp size={13} className="text-rose-500" />
                      <span className="text-slate-500 text-[11px]">点赞:</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {(agent.likesCount ?? (agent.id === 'agent_ecommerce_cs' ? 6420 : agent.id === 'agent_geo_helper' ? 34200 : agent.id === 'agent_doc_emergency' ? 58600 : 18)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agent Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  {agent.status === 'published' ? (
                    <button
                      onClick={() => handleToggleAgentStatus(agent.id, 'offline')}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      下架智能体
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleAgentStatus(agent.id, 'published')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      重新发布上架
                    </button>
                  )}

                  {agent.status === 'published' ? (
                    <button
                      type="button"
                      disabled
                      title="请先下架智能体后再更新 Skill 包"
                      className="flex-1 py-2 px-3 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1 opacity-75"
                    >
                      <RefreshCw size={12} />
                      <span>更新 Skill 包</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setInstanceForSkillReplacement(null);
                        setAgentForSkillReplacement(agent);
                        setShowPublishModal(true);
                      }}
                      className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RefreshCw size={12} />
                      <span>更新 Skill 包</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
          )}

          {agentMgmtSubTab === 'private' && (
            <CustomerInstancesPanel
              instances={instancesList}
              leads={leadsList}
              onUpdateSkill={(instance) => {
                setAgentForSkillReplacement(null);
                setInstanceForSkillReplacement(instance);
                setShowPublishModal(true);
              }}
            />
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE 3: 定制服务（咨询 + 订单同一流程）                  */}
      {/* ========================================================= */}
      {activeTab === 'custom-services' && (
        <div className="space-y-6">
          <CreatorCustomOrdersPanel sessionLeads={sessionLeads} />
        </div>
      )}

      {/* ========================================================= */}
      {/* 实名认证弹窗（由顶部「已认证 AI 专家」入口打开）            */}
      {/* ========================================================= */}
      {showRealNameModal && (() => {
        const publishedHermesCount = agentsList.filter(
          (a) => a.status === 'published' && a.sandboxValidationPassed
        ).length;
        const realNameValid = verifyStatus === 'verified';
        const accountStatusNormal = accountStatus === 'normal';
        const isEligibleAuto = realNameValid && publishedHermesCount >= 1 && accountStatusNormal;

        // Determine FDE certification status
        let effectiveFdeStatus: FDECertStatus = 'not_eligible';
        if (fdeManualOverride !== 'auto') {
          effectiveFdeStatus = fdeManualOverride;
        } else if (verifyStatus === 'revoked' || accountStatus === 'banned') {
          effectiveFdeStatus = 'revoked';
        } else if (verifyStatus === 'expired' || accountStatus === 'investigating') {
          effectiveFdeStatus = 'suspended';
        } else if (publishedHermesCount === 0) {
          effectiveFdeStatus = 'suspended';
        } else if (!realNameValid) {
          effectiveFdeStatus = 'not_eligible';
        } else if (isExpertRole(userRole) && currentTier >= 1) {
          effectiveFdeStatus = 'certified';
        } else {
          effectiveFdeStatus = agreedFdeRules ? 'eligible_pending_confirm' : 'not_eligible';
        }

        return (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
            onClick={() => setShowRealNameModal(false)}
          >
            <div
              className="bg-slate-50 rounded-3xl max-w-4xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">实名认证与专家认证</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRealNameModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            {/* Top Overview Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      AI 专家实名认证中心
                    </h2>
                    {verifyStatus === 'verified' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>认证成功 (已绑定身份证)</span>
                      </span>
                    )}
                    {verifyStatus === 'in_progress' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1">
                        <RefreshCw size={13} className="animate-spin text-blue-600" />
                        <span>认证中 (阿里云核验中)</span>
                      </span>
                    )}
                    {verifyStatus === 'manual_review' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1">
                        <Clock size={13} className="text-amber-700" />
                        <span>人工复核中 (预计 2 小时)</span>
                      </span>
                    )}
                    {verifyStatus === 'unverified' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        未认证 (可编辑草稿)
                      </span>
                    )}
                    {verifyStatus === 'failed' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 flex items-center gap-1">
                        <AlertCircle size={13} className="text-rose-600" />
                        <span>认证失败</span>
                      </span>
                    )}
                    {verifyStatus === 'expired' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                        认证已失效 (需重新核验)
                      </span>
                    )}
                    {verifyStatus === 'revoked' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                        认证已撤销
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    完成实名核验即可公开发布智能体、点亮认证徽章并接收平台客户咨询。
                  </p>
                </div>

                {/* Status Switcher (For full testing of all 7 states) */}
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block mb-1">
                    认证状态切换模拟:
                  </span>
                  <select
                    value={verifyStatus}
                    onChange={(e) => setVerifyStatus(e.target.value as RealNameVerifyStatus)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="verified">1. 认证成功 (verified)</option>
                    <option value="in_progress">2. 认证中 (in_progress)</option>
                    <option value="manual_review">3. 人工复核中 (manual_review)</option>
                    <option value="unverified">4. 未认证 (unverified)</option>
                    <option value="failed">5. 认证失败 (failed)</option>
                    <option value="expired">6. 认证已失效 (expired)</option>
                    <option value="revoked">7. 认证已撤销 (revoked)</option>
                  </select>
                </div>
              </div>

              {/* Status Alert Panels */}
              {verifyStatus === 'failed' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={15} className="text-rose-600" />
                    <span>实名认证未通过原因：</span>
                  </div>
                  <p className="text-rose-800 pl-5 leading-relaxed">{rejectReason}</p>
                  <div className="pl-5 pt-1 flex items-center gap-2">
                    <button
                      onClick={() => setVerifyStatus('in_progress')}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors"
                    >
                      重新发起阿里云核验
                    </button>
                    <span className="text-[11px] text-rose-600">
                      请确保身份证照片光线充足且无遮挡反光
                    </span>
                  </div>
                </div>
              )}

              {verifyStatus === 'manual_review' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock size={15} className="text-amber-700" />
                    <span>人工复核中：证件生僻字或照片模糊已转入专人复核通道</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    平台合规审核团队将在工作日 2 小时内完成二要素人工核对。复核期间您可以继续编辑智能体草稿。
                  </p>
                </div>
              )}

              {verifyStatus === 'expired' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={15} className="text-amber-700" />
                    <span>实名认证已失效：身份证件到期或需定期重新核验</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    根据监管要求，您的身份证件有效期已截止。请重新进行阿里云刷脸核验以恢复主页公开与咨询功能。
                  </p>
                  <button
                    onClick={() => setVerifyStatus('verified')}
                    className="mt-1 px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    更新并重新核验
                  </button>
                </div>
              )}

              {/* Real-name Information Summary & Form */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">真实姓名</span>
                    <div className="font-bold text-slate-900 text-sm">{idCardName}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {verifyStatus === 'verified' ? '✓ 公安二要素一致' : '待核验'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">居民身份证号码 (脱敏)</span>
                    <div className="font-bold text-slate-900 text-sm font-mono">{idCardNumber}</div>
                    <span className="text-[10px] text-slate-400">前台对外展示仅显示已实名</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">绑定手机号</span>
                    <div className="font-bold text-slate-900 text-sm font-mono">{phoneMasked}</div>
                    <span className="text-[10px] text-slate-400">用于接收商机咨询通知</span>
                  </div>
                </div>

                {/* Core Notes Callout */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                  <div className="font-bold text-blue-950 flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-blue-700" />
                    <span>实名认证须知与隐私安全保护：</span>
                  </div>
                  <ul className="text-[11.5px] text-blue-900 space-y-1 list-disc pl-4 leading-relaxed">
                    <li>
                      <strong>未实名认证前</strong>可正常编辑创作者草稿与测试沙箱；
                    </li>
                    <li>
                      <strong>完成实名认证后</strong>方可公开个人主页、发布对外智能体、接收平台内客户咨询；
                    </li>
                    <li>
                      <strong>一张身份证原则上只对应一个创作者账号</strong>，防范恶意批量开号；
                    </li>
                    <li>
                      <strong>严格隐私保护</strong>：公开页面仅展示“已实名认证”徽章，绝不向访客暴露真实姓名、证件号码、人脸识别特征或手机号。
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 5. FDE 认证逻辑体系与自动判定 (Section 5.1 - 5.4)           */}
            {/* ========================================================= */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Award size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        5. FDE 认证逻辑与自动判定体系
                      </h2>
                    </div>
                    {effectiveFdeStatus === 'certified' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1">
                        <Award size={13} className="text-amber-700" />
                        <span>已获得「认证 FDE」标识</span>
                      </span>
                    )}
                    {effectiveFdeStatus === 'eligible_pending_confirm' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
                        可申请 (待确认规则)
                      </span>
                    )}
                    {effectiveFdeStatus === 'not_eligible' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        未满足条件
                      </span>
                    )}
                    {effectiveFdeStatus === 'suspended' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1">
                        <AlertCircle size={13} className="text-amber-700" />
                        <span>认证暂停 (宽限期内)</span>
                      </span>
                    )}
                    {effectiveFdeStatus === 'revoked' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                        认证已撤销
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    一期无需人工审核专业能力。只要满足实名与可运行智能体要求，即可自动获得 FDE 认证标识。
                  </p>
                </div>

                {/* FDE Status Tester */}
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block mb-1">
                    5.3 FDE 5 状态手动切换:
                  </span>
                  <select
                    value={fdeManualOverride}
                    onChange={(e) => setFdeManualOverride(e.target.value as any)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="auto">自动判定模式 (推荐)</option>
                    <option value="certified">已认证 (certified)</option>
                    <option value="eligible_pending_confirm">可申请 (eligible_pending_confirm)</option>
                    <option value="not_eligible">未满足条件 (not_eligible)</option>
                    <option value="suspended">认证暂停 (suspended)</option>
                    <option value="revoked">已撤销 (revoked)</option>
                  </select>
                </div>
              </div>

              {/* 5.1 FDE 认证含义与官方免责声明 (Exact verbatim text) */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Award size={15} />
                    <span>5.1 FDE 认证官方含义与前台展示说明</span>
                  </div>
                  <span className="text-[10px] text-slate-400">官方标准文案</span>
                </div>

                {/* Official Disclaimer Quote */}
                <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs text-amber-200 leading-relaxed font-medium">
                  {FDE_CERT_DISCLAIMER}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 bg-emerald-950/50 rounded-xl border border-emerald-500/30 space-y-1.5">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>“认证 FDE”仅代表：</span>
                    </div>
                    <ul className="text-slate-300 text-[11px] space-y-1 list-disc pl-4">
                      <li>创作者已完成真人实名认证；</li>
                      <li>创作者至少发布一个经平台验证、当前可由 Hermes 运行的智能体。</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-rose-950/50 rounded-xl border border-rose-500/30 space-y-1.5">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      <span>不代表：</span>
                    </div>
                    <ul className="text-slate-300 text-[11px] space-y-1 list-disc pl-4">
                      <li>平台审核过其项目经验；</li>
                      <li>平台保证其二次开发能力；</li>
                      <li>平台保证其服务质量；</li>
                      <li>平台承诺其能够完成企业级交付。</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 5.2 获得 FDE 认证条件自动判定器 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>5.2 获得 FDE 认证的 4 大条件自动评估：</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    当前判定结果：
                    <strong
                      className={
                        effectiveFdeStatus === 'certified'
                          ? 'text-emerald-600'
                          : effectiveFdeStatus === 'eligible_pending_confirm'
                          ? 'text-blue-600'
                          : 'text-amber-600'
                      }
                    >
                      {effectiveFdeStatus === 'certified'
                        ? '全部达标 · 认证有效'
                        : effectiveFdeStatus === 'eligible_pending_confirm'
                        ? '条件已满足 · 待一键确认生效'
                        : '尚有条件未满足'}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Condition 1 */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      realNameValid
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">条件 1: 实名认证有效 (verified)</span>
                      {realNameValid ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={16} className="text-slate-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      当前状态：
                      <strong>
                        {verifyStatus === 'verified'
                          ? '已实名'
                          : `未通过 (${verifyStatus})`}
                      </strong>
                    </p>
                  </div>

                  {/* Condition 2 */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      publishedHermesCount >= 1
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">
                        条件 2: 已发布且可运行智能体 ≥ 1
                      </span>
                      {publishedHermesCount >= 1 ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={16} className="text-slate-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      当前已发布沙箱验证通过智能体：
                      <strong>{publishedHermesCount} 款</strong>
                    </p>
                  </div>

                  {/* Condition 3 */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      accountStatusNormal
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">条件 3: 账号状态正常</span>
                      {accountStatusNormal ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={16} className="text-slate-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      当前状态：<strong>{accountStatusNormal ? '正常 (无违规投诉)' : '调查中'}</strong>
                    </p>
                  </div>

                  {/* Condition 4 */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      agreedFdeRules
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">条件 4: 同意 FDE 专属商业合作协议</span>
                      {agreedFdeRules ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={16} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] text-slate-600">
                        {agreedFdeRules ? '已签署同意' : '未签署'}
                      </span>
                      {!agreedFdeRules && (
                        <button
                          onClick={() => setAgreedFdeRules(true)}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          一键签署并激活
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 晋升入口已取消：平台仅普通用户 / AI 专家 */}
              </div>

              {/* 认证状态保障与动态维系机制说明 */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-600" />
                    <span>认证状态保障与动态维系机制</span>
                  </div>
                  <span className="text-[10px] text-slate-500">含 7 天下架宽限期保障</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Suspension triggers */}
                  <div className="space-y-2">
                    <div className="font-bold text-amber-800 flex items-center gap-1">
                      <AlertCircle size={13} className="text-amber-600" />
                      <span>【认证暂停】触发情形：</span>
                    </div>
                    <ul className="text-slate-600 text-[11px] space-y-1.5 list-disc pl-4 leading-relaxed">
                      <li>
                        <strong>下架最后一个公开智能体</strong>：
                        平台给予 <span className="font-bold text-amber-700">7 天宽限期</span>
                        。宽限期内创作者主页保留，但不进入 FDE 专家集合页；超过 7 天仍未重新上架可运行智能体，FDE 标识显示为“认证暂停”；
                      </li>
                      <li>
                        <strong>已发布智能体版本失效</strong>：
                        底层框架升级导致智能体无法被 Hermes 正常唤起，提示修复；
                      </li>
                      <li>
                        <strong>实名认证失效</strong>：需重新进行阿里云活体核验；
                      </li>
                      <li>
                        <strong>创作者主动关闭平台内咨询能力</strong>；
                      </li>
                      <li>
                        <strong>账号处于客户投诉调查期</strong>。
                      </li>
                    </ul>
                  </div>

                  {/* Revocation triggers */}
                  <div className="space-y-2">
                    <div className="font-bold text-rose-800 flex items-center gap-1">
                      <Trash2 size={13} className="text-rose-600" />
                      <span>【认证撤销】触发情形：</span>
                    </div>
                    <ul className="text-slate-600 text-[11px] space-y-1.5 list-disc pl-4 leading-relaxed">
                      <li>
                        <strong>身份信息造假或冒用他人证件</strong>；
                      </li>
                      <li>
                        <strong>上传恶意高危 Skill 或窃取用户隐私</strong>；
                      </li>
                      <li>
                        <strong>严重侵犯第三方知识产权或代码抄袭</strong>；
                      </li>
                      <li>
                        <strong>欺诈客户或诱导用户绕过平台进行私下交易</strong>；
                      </li>
                      <li>
                        <strong>多次严重违反社区公约或内容安全规则</strong>；
                      </li>
                      <li>
                        <strong>创作者主动申请注销身份</strong>。
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Agent Publish / Skill Replacement Wizard Modal */}
      <AgentPublishWizardModal
        isOpen={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          setAgentForSkillReplacement(null);
          setInstanceForSkillReplacement(null);
        }}
        agentToUpdate={
          agentForSkillReplacement ||
          (instanceForSkillReplacement ? buildAgentFromInstance(instanceForSkillReplacement) : null)
        }
        mode={agentForSkillReplacement || instanceForSkillReplacement ? 'replace_skill' : 'create'}
        skillReplaceHint={
          instanceForSkillReplacement
            ? `正在为【${instanceForSkillReplacement.title}】更新专属 Skill 包，上传后将进入 Hermes 校验流程`
            : undefined
        }
        onSuccessPublish={(newAgent) => {
          if (instanceForSkillReplacement) {
            setInstancesList((prev) =>
              prev.map((i) =>
                i.id === instanceForSkillReplacement.id
                  ? {
                      ...i,
                      boundSkillVersion:
                        newAgent.version || newAgent.skillPackage?.version || i.boundSkillVersion,
                      status:
                        newAgent.status === 'published'
                          ? ('active' as const)
                          : ('hermes_validating' as const),
                      updatedAt: '刚刚'
                    }
                  : i
              )
            );
            setInstanceForSkillReplacement(null);
          } else {
            setAgentsList((prev) => {
              const exists = prev.some((a) => a.id === newAgent.id);
              if (exists) {
                return prev.map((a) => (a.id === newAgent.id ? { ...a, ...newAgent } : a));
              }
              return [newAgent, ...prev];
            });
            setAgentForSkillReplacement(null);
          }
          setShowPublishModal(false);
        }}
      />


    </div>
  );
};
