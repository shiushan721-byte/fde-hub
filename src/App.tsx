import React, { useEffect, useRef, useState } from 'react';
import { Sidebar, MainNavRoute } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { HellomeHomeView } from './components/HellomeHomeView';
import { FDEProfileView } from './components/FDEProfileView';
import { WorkspaceView } from './components/WorkspaceView';
import { OrderCenterView } from './components/OrderCenterView';
import { BuyerOrderBillingView } from './components/BuyerOrderBillingView';
import { ApiKeyView } from './components/ApiKeyView';
import { AgentTestDrawer } from './components/AgentTestDrawer';
import { ConsultationModal } from './components/ConsultationModal';
import { ConsultationMessagesDrawer } from './components/ConsultationMessagesDrawer';
import { ConsultDealDrawer } from './components/ConsultDealDrawer';
import { MessagesInboxView } from './components/MessagesInboxView';
import { RechargeModal } from './components/RechargeModal';
import { CreatorCenterView, CreatorCenterTab } from './components/CreatorCenterView';
import { PersonalCenterView } from './components/PersonalCenterView';
import { CreatorOnboardingModal } from './components/CreatorOnboardingModal';
import { CreatorDebugPanelModal } from './components/CreatorDebugPanelModal';
import { UserIdentityRole, CustomerLeadItem, ConsultationMessage } from './types/creator';
import { FavoritesView } from './components/FavoritesView';
import { ExpertsCatalogView } from './components/ExpertsCatalogView';
import { AgentDetailView } from './components/AgentDetailView';
import { LocalWorkbenchView } from './components/LocalWorkbenchView';
import { InspirationDetailView } from './components/InspirationDetailView';
import { FDEIntroView } from './components/FDEIntroView';
import { DemoModeBar } from './components/DemoModeBar';
import { AdminApp } from './admin/AdminApp';
import { useCatalog } from './lib/catalog';
import { api } from './lib/api';
import { ensureMarketplaceSession } from './lib/marketplaceAuth';
import {
  agentShareHash,
  clearAgentShareHash,
  parseAgentShareHash,
  toHellomeAgentItem
} from './lib/agentShare';

import {
  mockCaseStudies,
  HellomeAgentItem
} from './data/mockData';
import { FDEExpert, AgentSolution, ConsultationFormState } from './types';
import { isExpertRole } from './utils/expertIdentity';
import {
  inspirationHash,
  parseInspirationHash,
  clearInspirationHash,
  type PublicInspiration,
  getMockPublicInspiration
} from './lib/inspiration';
import { type InboxChannel } from './lib/notificationInbox';
import {
  type NavigationFocus,
  type NotificationNavigationTarget
} from './lib/notificationNavigation';

export default function App() {
  const catalog = useCatalog();
  const [showAdmin, setShowAdmin] = useState(false);

  // Global sidebar route: 'hellome-home' | 'author-profile' | 'creator-center' | 'workspace' | 'account' | 'apikey'
  const [currentRoute, setCurrentRoute] = useState<
    MainNavRoute | 'author-profile' | 'agent-detail' | 'inspiration-detail'
  >('hellome-home');
  const [creatorCenterTab, setCreatorCenterTab] = useState<CreatorCenterTab>('my-agents');
  const [navigationFocus, setNavigationFocus] = useState<NavigationFocus | null>(null);
  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Agent interactive trial drawer state
  const [activeTestAgent, setActiveTestAgent] = useState<AgentSolution | null>(null);
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  const [workbenchTabs, setWorkbenchTabs] = useState<HellomeAgentItem[]>([]);
  const [activeWorkbenchTabId, setActiveWorkbenchTabId] = useState<string | null>(null);

  // Consultation modal & in-platform chat workspace
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationTargetExpert, setConsultationTargetExpert] = useState<FDEExpert | null>(null);
  const [consultationReferenceAgent, setConsultationReferenceAgent] = useState<AgentSolution | null>(null);
  const [consultationInitialPrompt, setConsultationInitialPrompt] = useState<string>('');
  const [consultationInitialProjectIds, setConsultationInitialProjectIds] = useState<string[]>([]);

  // 咨询提交后写入消息中心；确认方案后才进入「我的定制」
  const [sessionConsultationLeads, setSessionConsultationLeads] = useState<CustomerLeadItem[]>([]);
  const [consultDealId, setConsultDealId] = useState<string | null>(null);
  const [isMessagesDrawerOpen, setIsMessagesDrawerOpen] = useState(false);
  const [messagesInitialTab, setMessagesInitialTab] = useState<InboxChannel>('activity');
  const [apiUnreadCount, setApiUnreadCount] = useState(0);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState('操作已完成');

  const showToast = (message: string) => {
    setSaveToastMessage(message);
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 2800);
  };

  // Favorites & Likes
  const [favoriteExpertIds, setFavoriteExpertIds] = useState<string[]>([]);
  const [favoriteAgentIds, setFavoriteAgentIds] = useState<string[]>([]);
  const [likedAgentIds, setLikedAgentIds] = useState<string[]>([]);
  const [favoritesInitialTab, setFavoritesInitialTab] = useState<'agents' | 'experts'>('agents');
  const [creatorCenterBackRoute, setCreatorCenterBackRoute] = useState<MainNavRoute | null>(null);

  // Agent detail page（页内打开，非弹窗）
  const [activeDetailAgent, setActiveDetailAgent] = useState<HellomeAgentItem | null>(null);
  const [agentDetailBackRoute, setAgentDetailBackRoute] = useState<MainNavRoute>('hellome-home');
  const [activeInspiration, setActiveInspiration] = useState<PublicInspiration | null>(null);
  const [homeCatalogueTab, setHomeCatalogueTab] = useState<'agents' | 'inspiration'>('agents');
  const [inspirationOrigin, setInspirationOrigin] = useState<'home' | 'agent'>('home');
  const detailAgentIdRef = useRef<string | null>(null);
  const inspirationIdRef = useRef<string | null>(null);
  const inspirationOriginRef = useRef<'home' | 'agent'>('home');
  const agentBeforeInspirationRef = useRef<HellomeAgentItem | null>(null);
  const ignoreAgentHashRef = useRef(false);
  const routeRef = useRef(currentRoute);
  routeRef.current = currentRoute;

  // Modals for becoming expert, recharge, onboarding, and identity debug panel
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isCreatorOnboardingOpen, setIsCreatorOnboardingOpen] = useState(false);
  const [isCreatorDebugOpen, setIsCreatorDebugOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserIdentityRole>('expert');

  const refreshUnreadCount = async () => {
    try {
      await ensureMarketplaceSession();
      const items = await api<Array<{ read: boolean }>>('/api/me/notifications');
      setApiUnreadCount(items.filter((n) => !n.read).length);
    } catch {
      setApiUnreadCount(0);
    }
  };

  const refreshEngagement = async () => {
    try {
      await ensureMarketplaceSession();
      const data = await api<{
        likedAgentIds: string[];
        favoriteAgentIds: string[];
        followedExpertIds: string[];
      }>('/api/me/engagement');
      setLikedAgentIds(data.likedAgentIds || []);
      setFavoriteAgentIds(data.favoriteAgentIds || []);
      setFavoriteExpertIds(data.followedExpertIds || []);
    } catch {
      /* keep local */
    }
  };

  useEffect(() => {
    void refreshUnreadCount();
    void refreshEngagement();
  }, [userRole, isMessagesDrawerOpen]);

  const handleSwitchUserRole = (role: UserIdentityRole) => {
    setUserRole(role === 'normal' ? 'normal' : 'expert');
  };

  // Active Author object
  const activeAuthor = catalog.experts.find((e) => e.id === activeAuthorId) || catalog.experts[0];

  const leaveAgentDetailRoute = () => {
    detailAgentIdRef.current = null;
    setActiveDetailAgent(null);
    clearAgentShareHash();
  };

  const leaveInspirationRoute = () => {
    inspirationIdRef.current = null;
    setActiveInspiration(null);
    clearInspirationHash();
  };

  const handleOpenInspiration = (
    item: PublicInspiration,
    origin: 'home' | 'agent' = 'home'
  ) => {
    inspirationOriginRef.current = origin;
    setInspirationOrigin(origin);
    if (origin === 'agent') {
      agentBeforeInspirationRef.current = activeDetailAgent;
    } else {
      agentBeforeInspirationRef.current = null;
      leaveAgentDetailRoute();
      setHomeCatalogueTab('inspiration');
    }
    inspirationIdRef.current = item.id;
    setActiveInspiration(item);
    setCurrentRoute('inspiration-detail');
    if (!item.id.startsWith('mock_')) {
      const nextHash = inspirationHash(item.id);
      if (window.location.hash.replace(/^#/, '') !== nextHash) {
        ignoreAgentHashRef.current = true;
        window.location.hash = nextHash;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restoreInspirationHash = (id: string) => {
    const nextHash = inspirationHash(id);
    if (window.location.hash.replace(/^#/, '') !== nextHash) {
      ignoreAgentHashRef.current = true;
      window.location.hash = nextHash;
    }
  };

  const restoreAgentHash = (agentId: string) => {
    const nextHash = agentShareHash(agentId);
    if (window.location.hash.replace(/^#/, '') !== nextHash) {
      ignoreAgentHashRef.current = true;
      window.location.hash = nextHash;
    }
  };

  const handleBackFromInspiration = () => {
    const returnAgent =
      inspirationOriginRef.current === 'agent'
        ? activeDetailAgent || agentBeforeInspirationRef.current
        : null;
    if (returnAgent) {
      leaveInspirationRoute();
      inspirationOriginRef.current = 'home';
      setInspirationOrigin('home');
      agentBeforeInspirationRef.current = null;
      detailAgentIdRef.current = returnAgent.id;
      setActiveDetailAgent(returnAgent);
      setCurrentRoute('agent-detail');
      restoreAgentHash(returnAgent.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentRoute('hellome-home');
    leaveInspirationRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAgentFromInspiration = async (agentId: string) => {
    const local = catalog.homeAgents.find((item) => item.id === agentId);
    if (local) {
      handleOpenAgentDetail(local);
      return;
    }
    try {
      const data = await api<Record<string, unknown>>(`/api/public/agents/${encodeURIComponent(agentId)}`);
      handleOpenAgentDetail(toHellomeAgentItem(data));
    } catch {
      showToast('智能体不存在或已下架');
    }
  };

  const handleOpenAuthorFromInspiration = (authorId: string) => {
    if (!catalog.experts.some((expert) => expert.id === authorId)) {
      showToast('作者主页暂不可用');
      return;
    }
    handleOpenAuthorProfile(authorId);
  };

  // Navigate to Author Profile Page (triggered when clicking author name)
  const handleOpenAuthorProfile = (authorId: string) => {
    leaveAgentDetailRoute();
    setActiveAuthorId(authorId);
    setCurrentRoute('author-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Agent Detail page in main content
  const handleOpenAgentDetail = (agent: HellomeAgentItem, shareToken = '') => {
    const from =
      currentRoute === 'agent-detail' || currentRoute === 'author-profile'
        ? agentDetailBackRoute
        : currentRoute === 'local-workbench'
          ? 'local-workbench'
          : 'hellome-home';
    setAgentDetailBackRoute(from);
    detailAgentIdRef.current = agent.id;
    setActiveDetailAgent(agent);
    setCurrentRoute('agent-detail');
    const existing = parseAgentShareHash(window.location.hash);
    const share = shareToken || (existing?.id === agent.id ? existing.share : '');
    const nextHash = agentShareHash(agent.id, share);
    if (window.location.hash.replace(/^#/, '') !== nextHash) {
      ignoreAgentHashRef.current = true;
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromAgentDetail = () => {
    if (activeInspiration) {
      setCurrentRoute('inspiration-detail');
      leaveAgentDetailRoute();
      restoreInspirationHash(activeInspiration.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentRoute(agentDetailBackRoute);
    leaveAgentDetailRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNotificationNavigate = async (target: NotificationNavigationTarget) => {
    setIsMessagesDrawerOpen(false);
    leaveAgentDetailRoute();
    leaveInspirationRoute();

    switch (target.route) {
      case 'consult':
        setConsultDealId(target.dealId || target.orderId || null);
        return;
      case 'orders':
        setNavigationFocus({ orderId: target.orderId });
        setCurrentRoute('orders');
        break;
      case 'order-center':
        setNavigationFocus(null);
        setCurrentRoute('order-center');
        break;
      case 'workspace':
        setNavigationFocus({ instanceId: target.instanceId });
        setCurrentRoute('workspace');
        break;
      case 'creator-center':
        if (!isExpertRole(userRole)) {
          showToast('请切换到 AI 专家身份后查看创作者中心');
          return;
        }
        setCreatorCenterTab(target.tab);
        setNavigationFocus({ orderId: target.orderId });
        setCurrentRoute('creator-center');
        break;
      case 'inspiration':
        try {
          const data = await api<PublicInspiration>(
            `/api/public/inspirations/${encodeURIComponent(target.showcaseId)}`
          );
          handleOpenInspiration(data);
        } catch {
          const local = getMockPublicInspiration(target.showcaseId);
          if (local) handleOpenInspiration(local);
          else showToast('成果不存在或已下线');
        }
        return;
      case 'agent': {
        const local = catalog.homeAgents.find((item) => item.id === target.agentId);
        if (local) {
          handleOpenAgentDetail(local, target.share);
        } else {
          try {
            const qs = target.share ? `?share=${encodeURIComponent(target.share)}` : '';
            const data = await api<Record<string, unknown>>(
              `/api/public/agents/${encodeURIComponent(target.agentId)}${qs}`
            );
            handleOpenAgentDetail(toHellomeAgentItem(data), target.share);
          } catch {
            showToast('智能体不存在或不可访问');
            return;
          }
        }
        break;
      }
      case 'expert':
        handleOpenAuthorProfile(target.expertId);
        return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearNavigationFocus = () => setNavigationFocus(null);

  useEffect(() => {
    let cancelled = false;

    const openFromHash = async () => {
      if (ignoreAgentHashRef.current) {
        ignoreAgentHashRef.current = false;
        return;
      }

      const inspirationParsed = parseInspirationHash(window.location.hash);
      if (inspirationParsed) {
        if (
          inspirationIdRef.current === inspirationParsed.id &&
          routeRef.current === 'inspiration-detail'
        ) {
          return;
        }
        try {
          const data = await api<PublicInspiration>(
            `/api/public/inspirations/${encodeURIComponent(inspirationParsed.id)}`
          );
          if (cancelled) return;
          handleOpenInspiration(data);
        } catch {
          const local = getMockPublicInspiration(inspirationParsed.id);
          if (cancelled) return;
          if (local) handleOpenInspiration(local);
          else showToast('成果不存在或已取消推荐');
        }
        return;
      }

      const parsed = parseAgentShareHash(window.location.hash);
      if (!parsed) {
        if (inspirationIdRef.current && routeRef.current === 'inspiration-detail') {
          inspirationIdRef.current = null;
          setActiveInspiration(null);
          setCurrentRoute('hellome-home');
        }
        if (detailAgentIdRef.current) {
          detailAgentIdRef.current = null;
          setActiveDetailAgent(null);
          setCurrentRoute(agentDetailBackRoute);
        }
        return;
      }
      if (detailAgentIdRef.current === parsed.id) return;

      const qs = parsed.share ? `?share=${encodeURIComponent(parsed.share)}` : '';
      try {
        const data = await api<Record<string, unknown>>(
          `/api/public/agents/${encodeURIComponent(parsed.id)}${qs}`
        );
        if (cancelled) return;
        handleOpenAgentDetail(toHellomeAgentItem(data), parsed.share);
      } catch {
        const local = catalog.homeAgents.find((item) => item.id === parsed.id);
        if (cancelled) return;
        if (local) {
          handleOpenAgentDetail(local, parsed.share);
        } else {
          showToast('分享链接无效或智能体已下架');
        }
      }
    };

    const onHashChange = () => {
      void openFromHash();
    };
    void openFromHash();
    window.addEventListener('hashchange', onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHashChange);
    };
    // catalog.homeAgents: retry local fallback after catalog loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.homeAgents]);

  const toggleEngagementList = async (input: {
    id: string;
    has: boolean;
    setList: React.Dispatch<React.SetStateAction<string[]>>;
    path: string;
    flag: string;
  }) => {
    input.setList((prev) => (input.has ? prev.filter((id) => id !== input.id) : [...prev, input.id]));
    try {
      await ensureMarketplaceSession();
      const result = await api<Record<string, unknown>>(input.path, {
        method: 'POST',
        body: '{}'
      });
      const on = Boolean(result[input.flag]);
      input.setList((prev) => {
        const next = new Set(prev);
        if (on) next.add(input.id);
        else next.delete(input.id);
        return [...next];
      });
      void refreshUnreadCount();
    } catch {
      input.setList((prev) => {
        const next = new Set(prev);
        if (input.has) next.add(input.id);
        else next.delete(input.id);
        return [...next];
      });
    }
  };

  // Toggle Like state on Agent
  const handleToggleLikeAgent = (agentId: string) => {
    void toggleEngagementList({
      id: agentId,
      has: likedAgentIds.includes(agentId),
      setList: setLikedAgentIds,
      path: `/api/me/agents/${encodeURIComponent(agentId)}/like`,
      flag: 'liked'
    });
  };

  const handleToggleFavoriteAgent = (agentId: string) => {
    void toggleEngagementList({
      id: agentId,
      has: favoriteAgentIds.includes(agentId),
      setList: setFavoriteAgentIds,
      path: `/api/me/agents/${encodeURIComponent(agentId)}/favorite`,
      flag: 'favorited'
    });
  };

  const handleToggleFavoriteExpert = (expertId: string) => {
    void toggleEngagementList({
      id: expertId,
      has: favoriteExpertIds.includes(expertId),
      setList: setFavoriteExpertIds,
      path: `/api/me/experts/${encodeURIComponent(expertId)}/follow`,
      flag: 'followed'
    });
  };

  const handleBackToHome = () => {
    setCurrentRoute('hellome-home');
    setActiveAuthorId(null);
    leaveAgentDetailRoute();
    leaveInspirationRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const solutionToHellomeItem = (agent: AgentSolution): HellomeAgentItem => {
    const existing = catalog.homeAgents.find((item) => item.id === agent.id);
    if (existing) return existing;
    return {
      id: agent.id,
      title: agent.title,
      desc: agent.description || agent.subtitle,
      category: agent.category,
      coverImage: agent.coverImage,
      gradient: 'from-slate-800 to-slate-950',
      tagColor: 'slate',
      authorName: agent.authorName,
      authorId: agent.authorId,
      likesCount: agent.likesCount,
      favoritesCount: 0,
      commentsCount: 0,
      price: agent.priceFrom,
      pricingPlans: agent.pricingPlans,
      canFDECustom: agent.canFDECustom,
      customProjects: agent.customProjects
    };
  };

  const openInWorkbench = (agent: HellomeAgentItem) => {
    setWorkbenchTabs((prev) => (prev.some((tab) => tab.id === agent.id) ? prev : [...prev, agent]));
    setActiveWorkbenchTabId(agent.id);
    setActiveAuthorId(null);
    leaveAgentDetailRoute();
    leaveInspirationRoute();
    setCurrentRoute('local-workbench');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeWorkbenchTab = (id: string) => {
    const next = workbenchTabs.filter((tab) => tab.id !== id);
    setWorkbenchTabs(next);
    if (activeWorkbenchTabId === id) {
      setActiveWorkbenchTabId(next[next.length - 1]?.id ?? null);
    }
  };

  // 使用市场智能体：在本地工作台以页签打开
  const handleTryAgent = (agent: AgentSolution) => {
    openInWorkbench(solutionToHellomeItem(agent));
  };

  // Trigger Consultation for specific FDE
  const handleOpenConsultExpert = (expert: FDEExpert, initialPrompt?: string) => {
    setConsultationTargetExpert(expert);
    setConsultationReferenceAgent(null);
    setConsultationInitialPrompt(initialPrompt || '');
    setConsultationInitialProjectIds([]);
    setIsConsultationModalOpen(true);
  };

  // Trigger Consultation from an Agent Card
  const handleConsultAgentCustomization = (
    agent: AgentSolution,
    initialPrompt?: string,
    projectIds?: string[]
  ) => {
    const author = catalog.experts.find((e) => e.id === agent.authorId) || catalog.experts[0];
    setConsultationTargetExpert(author);
    setConsultationReferenceAgent(agent);
    setConsultationInitialProjectIds(projectIds || []);
    setConsultationInitialPrompt(
      initialPrompt ||
        (projectIds?.length
          ? `想基于「${agent.title}」做定制`
          : `咨询「${agent.title}」的技术接入与服务方案`)
    );
    setIsConsultationModalOpen(true);
  };

  // When user submits consultation form -> 消息·咨询提醒，不直接创建定制订单
  const handleConsultationSubmitSuccess = (data: ConsultationFormState) => {
    const spec = data.customizationSpec;
    const customizationSummary = spec
      ? [
          spec.unsatisfiedAreas,
          spec.pagesToModify.length ? `页面：${spec.pagesToModify.join('、')}` : '',
          spec.flowsToModify.length ? `流程：${spec.flowsToModify.join('、')}` : '',
          spec.needsCustomerData ? `需客户数据：${spec.customerDataDescription || '是'}` : '',
          spec.needsThirdPartyIntegration ? `需系统集成：${spec.integrationsDescription || '是'}` : ''
        ]
          .filter(Boolean)
          .join(' · ')
      : data.businessProblem;

    const firstMessage: ConsultationMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      senderName: data.contactName || '企业客户',
      text:
        data.businessProblem?.trim() ||
        data.additionalNotes?.trim() ||
        '已提交定制需求，请查看。',
      time: '刚刚'
    };

    const newLead: CustomerLeadItem = {
      id: `lead_session_${Date.now()}`,
      clientName: data.contactName || '企业客户',
      clientCompany: data.contactCompany || '未填写企业',
      clientAvatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      agentId: data.agentId || '',
      agentTitle: data.referenceAgentTitle || (data.agentId ? '未指定智能体' : '直接向专家咨询'),
      standardVersionAtRequest: data.standardVersionAtRequest,
      customizationSummary,
      sourceType: 'consultation',
      contactPhone: data.contactPhone || '',
      consultedAt: new Date().toISOString(),
      intentLevel: 'high',
      lastActivity: '刚刚保存定制需求',
      status: 'new',
      notes: data.businessProblem || '',
      messages: [firstMessage]
    };

    if (catalog.source === 'api') {
      import('./lib/marketplaceAuth').then(({ ensureMarketplaceSession }) =>
        ensureMarketplaceSession()
          .then(() =>
            api<{ lead?: { id: string } }>('/api/consultations', {
              method: 'POST',
              body: JSON.stringify({
                ...data,
                expertId: consultationTargetExpert?.id,
                createCustomOrder: false,
                baseAgentVersion: data.standardVersionAtRequest || 'v1.0.0',
                priceCents: data.priceCents
              })
            })
          )
          .then(() => {
            showToast('定制需求已提交，有进展时会在消息中提醒你');
            void refreshUnreadCount();
          })
          .catch(() => {
            setSessionConsultationLeads((prev) => [newLead, ...prev]);
            showToast('定制需求已保存，有进展时会通过消息提醒你');
          })
      );
    } else {
      setSessionConsultationLeads((prev) => [newLead, ...prev]);
      showToast('定制需求已保存，有进展时会通过消息提醒你');
    }

    setIsConsultationModalOpen(false);
    setIsTestDrawerOpen(false);
  };

  const hellomeItemToSolution = (agent: HellomeAgentItem): AgentSolution => {
    const existing =
      catalog.solutions.find((a) => a.id === agent.id) ||
      catalog.solutions.find((a) => a.title === agent.title);
    if (existing) {
      return {
        ...existing,
        canFDECustom: agent.canFDECustom,
        customProjects: agent.customProjects || existing.customProjects
      };
    }
    return {
      id: agent.id,
      title: agent.title,
      subtitle: agent.desc,
      coverImage: agent.coverImage,
      authorId: agent.authorId || 'fde-linran',
      authorName: agent.authorName || '认证创作者',
      authorAvatar: '',
      authorVerifyType: 'verified_fde',
      authorVerifyLabel: '认证 FDE',
      tags: [agent.category],
      category: agent.category,
      likesCount: typeof agent.likesCount === 'number' ? agent.likesCount : 0,
      usesCount: 0,
      rating: agent.rating || 5,
      description: agent.desc,
      capabilities: [],
      samplePrompts: [],
      systemPromptSnippet: '',
      businessIntegrationTips: '',
      priceFrom: agent.price || 0,
      pricingPlans: agent.pricingPlans,
      canFDECustom: agent.canFDECustom,
      customProjects: agent.customProjects,
      demoConversation: []
    };
  };

  // 从智能体详情发起定制：已选定基础智能体，直接进入表单
  const handleCustomizeFromHellomeAgent = (agent: HellomeAgentItem, projectIds?: string[]) => {
    handleConsultAgentCustomization(hellomeItemToSolution(agent), undefined, projectIds);
  };

  if (showAdmin) {
    return <AdminApp onExit={() => {
      setShowAdmin(false);
      catalog.refresh();
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Left Global Sidebar */}
      <Sidebar
        currentRoute={
          currentRoute === 'author-profile' ||
          currentRoute === 'agent-detail' ||
          currentRoute === 'inspiration-detail'
            ? 'hellome-home'
            : currentRoute
        }
        onNavigate={(route) => {
          if (route === 'account') {
            setCreatorCenterTab('account');
            setCurrentRoute('creator-center');
            setActiveAuthorId(null);
            leaveAgentDetailRoute();
            leaveInspirationRoute();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          setCurrentRoute(route);
          setActiveAuthorId(null);
          leaveAgentDetailRoute();
          leaveInspirationRoute();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        fdeExpertCount={catalog.experts.length}
        favoritesCount={favoriteAgentIds.length + favoriteExpertIds.length}
        onOpenBecomeCreator={() => setIsCreatorOnboardingOpen(true)}
        onOpenMyExpertHome={() => {
          setCreatorCenterBackRoute('fde-experts');
          setCreatorCenterTab('my-agents');
          setCurrentRoute('creator-center');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentRole={userRole}
      />

      {/* 2. Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-18' : 'ml-56'
        } ${currentRoute === 'local-workbench' ? 'h-screen overflow-hidden' : ''}`}
      >
        {/* Top Header */}
        <TopHeader
          currentRoute={currentRoute}
          onNavigate={(route) => {
            if (route === 'account') {
              setCreatorCenterTab('account');
              setCurrentRoute('creator-center');
              setActiveAuthorId(null);
              leaveAgentDetailRoute();
              leaveInspirationRoute();
              return;
            }
            setCurrentRoute(route);
            setActiveAuthorId(null);
            leaveAgentDetailRoute();
            leaveInspirationRoute();
            if (route !== 'creator-center') setCreatorCenterBackRoute(null);
          }}
          activeAuthorName={activeAuthor?.name}
          activeAgentTitle={activeDetailAgent?.title}
          activeInspirationTitle={activeInspiration?.title}
          inspirationBackLabel={inspirationOrigin === 'agent' ? '返回智能体' : '返回发现灵感'}
          onBackToHome={
            currentRoute === 'agent-detail'
              ? handleBackFromAgentDetail
              : currentRoute === 'inspiration-detail'
                ? handleBackFromInspiration
                : handleBackToHome
          }
          workbenchTabs={workbenchTabs.map((tab) => ({ id: tab.id, title: tab.title }))}
          activeWorkbenchTabId={activeWorkbenchTabId}
          onSelectWorkbenchTab={setActiveWorkbenchTabId}
          onCloseWorkbenchTab={closeWorkbenchTab}
          onOpenRechargeModal={() => setIsRechargeOpen(true)}
          unreadCount={apiUnreadCount + sessionConsultationLeads.length}
          favoriteAgentCount={favoriteAgentIds.length}
          favoriteExpertCount={favoriteExpertIds.length}
          onOpenFavorites={(tab) => {
            setFavoritesInitialTab(tab);
            setCurrentRoute('favorites');
            setActiveAuthorId(null);
            leaveAgentDetailRoute();
            leaveInspirationRoute();
          }}
          onOpenBecomeCreator={() => setIsCreatorOnboardingOpen(true)}
          userRole={userRole}
          onToggleUserRole={(role) => handleSwitchUserRole(role)}
          onOpenConsultationDrawer={() => setIsMessagesDrawerOpen(true)}
        />

        {/* Dynamic Route Content */}
        <main
          className={
            currentRoute === 'local-workbench'
              ? 'flex-1 min-h-0 flex flex-col w-full'
              : 'flex-1 w-full'
          }
        >
          {currentRoute === 'local-workbench' && (
            <LocalWorkbenchView
              agents={catalog.homeAgents}
              tabs={workbenchTabs}
              activeTabId={activeWorkbenchTabId}
              onOpenAgent={openInWorkbench}
              onBrowseMarket={() => {
                setCurrentRoute('hellome-home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onCustomize={handleCustomizeFromHellomeAgent}
              onOpenAuthor={handleOpenAuthorProfile}
              onOpenAgentDetail={handleOpenAgentDetail}
            />
          )}

          {/* ROUTE 1: Hellome Home */}
          {currentRoute === 'hellome-home' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <HellomeHomeView
                onOpenAuthorProfile={handleOpenAuthorProfile}
                onOpenAgentDetail={handleOpenAgentDetail}
                onOpenInspiration={handleOpenInspiration}
                initialCatalogueTab={homeCatalogueTab}
                favoriteAgentIds={favoriteAgentIds}
                onToggleFavoriteAgent={handleToggleFavoriteAgent}
                likedAgentIds={likedAgentIds}
                onToggleLikeAgent={handleToggleLikeAgent}
                onNavigateToCreatorCenter={() => {
                  setCurrentRoute('creator-center');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                agents={catalog.homeAgents}
                banners={catalog.banners}
                categories={catalog.categories}
                sectionTitle={catalog.settings.sectionTitle}
                creatorCountLabel={catalog.settings.creatorCountLabel}
                onToast={showToast}
              />
            </div>
          )}

          {/* ROUTE 2: FDE 专家集合页 (发现认证创作者与架构师) */}
          {currentRoute === 'fde-experts' && (
            <ExpertsCatalogView
              experts={catalog.experts}
              onSelectExpert={handleOpenAuthorProfile}
              onConsultExpert={handleOpenConsultExpert}
              onToggleFavorite={handleToggleFavoriteExpert}
              favoriteExpertIds={favoriteExpertIds}
              isExpert={isExpertRole(userRole)}
              onOpenMyExpertHome={() => {
                setCreatorCenterBackRoute('fde-experts');
                setCreatorCenterTab('my-agents');
                setCurrentRoute('creator-center');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenBecomeCreator={() => {
                setCurrentRoute('fde-intro');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {/* ROUTE: FDE 专属介绍页 (了解 FDE 是什么、收益与准入、转化成为创作者/申请 FDE) */}
          {currentRoute === 'fde-intro' && (
            <FDEIntroView
              userRole={userRole}
              onBack={() => {
                setCurrentRoute('hellome-home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenBecomeCreator={() => setIsCreatorOnboardingOpen(true)}
              onOpenBecomeFDEModal={() => setIsCreatorOnboardingOpen(true)}
              onNavigateToCreatorCenter={() => {
                setCurrentRoute('creator-center');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {/* ROUTE: Favorites (收藏的专家与智能体) */}
          {currentRoute === 'favorites' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <FavoritesView
                favoriteAgentIds={favoriteAgentIds}
                favoriteExpertIds={favoriteExpertIds}
                allAgents={catalog.homeAgents}
                allExperts={catalog.experts}
                onToggleFavoriteAgent={handleToggleFavoriteAgent}
                onToggleFavoriteExpert={handleToggleFavoriteExpert}
                onOpenAuthorProfile={handleOpenAuthorProfile}
                onOpenAgentDetail={handleOpenAgentDetail}
                likedAgentIds={likedAgentIds}
                onToggleLikeAgent={handleToggleLikeAgent}
                onConsultExpert={handleOpenConsultExpert}
                onNavigateToHome={handleBackToHome}
                initialTab={favoritesInitialTab}
              />
            </div>
          )}

          {currentRoute === 'inspiration-detail' && activeInspiration && (
            <InspirationDetailView
              item={activeInspiration}
              onBack={handleBackFromInspiration}
              backLabel={inspirationOrigin === 'agent' ? '返回智能体' : '返回发现灵感'}
              onOpenAgent={(agentId) => {
                void handleOpenAgentFromInspiration(agentId);
              }}
              onOpenAgentAuthor={handleOpenAuthorFromInspiration}
              onToast={showToast}
              onLikeChange={(next) => {
                setActiveInspiration((prev) => (prev ? { ...prev, ...next } : prev));
              }}
            />
          )}

          {/* ROUTE: Agent Detail Page */}
          {currentRoute === 'agent-detail' && activeDetailAgent && (
            <AgentDetailView
              agent={activeDetailAgent}
              onBack={handleBackFromAgentDetail}
              onOpenAuthorProfile={handleOpenAuthorProfile}
              onConsultAuthor={(agent) => {
                handleCustomizeFromHellomeAgent(agent);
              }}
              onCustomizeFromAgent={(agent) => {
                handleCustomizeFromHellomeAgent(agent);
              }}
              onUseAgent={(agent) => {
                openInWorkbench(agent);
              }}
              isFavorite={favoriteAgentIds.includes(activeDetailAgent.id)}
              onToggleFavorite={handleToggleFavoriteAgent}
              isLiked={likedAgentIds.includes(activeDetailAgent.id)}
              onToggleLike={handleToggleLikeAgent}
              isAuthorFollowed={favoriteExpertIds.includes(activeDetailAgent.authorId || '')}
              onToggleFollowAuthor={handleToggleFavoriteExpert}
              onToast={showToast}
              enableAuthorShowcaseTools={isExpertRole(userRole)}
              onOpenInspiration={(item) => handleOpenInspiration(item, 'agent')}
            />
          )}

          {/* ROUTE 2: Author Profile Page */}
          {currentRoute === 'author-profile' && activeAuthor && (
            <FDEProfileView
              expert={activeAuthor}
              agentSolutions={catalog.solutions}
              caseStudies={mockCaseStudies}
              onBack={handleBackToHome}
              onConsult={handleOpenConsultExpert}
              onTryAgent={handleTryAgent}
              onConsultAgent={handleConsultAgentCustomization}
              onToggleFavorite={handleToggleFavoriteExpert}
              isFavorite={favoriteExpertIds.includes(activeAuthor.id)}
              favoriteAgentIds={favoriteAgentIds}
              onToggleFavoriteAgent={handleToggleFavoriteAgent}
            />
          )}

          {currentRoute === 'messages' && (
            <MessagesInboxView
              leads={sessionConsultationLeads}
              initialTab={messagesInitialTab}
              onNavigate={handleNotificationNavigate}
              onUnreadChange={() => void refreshUnreadCount()}
            />
          )}

          {/* ROUTE 3: AI 专家中心（智能体管理 / 定制服务 / 收益） */}
          {currentRoute === 'creator-center' && isExpertRole(userRole) && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <CreatorCenterView
                key={creatorCenterTab}
                initialTab={creatorCenterTab}
                onOpenOnboardingModal={() => setIsCreatorOnboardingOpen(true)}
                onOpenBecomeFDE={() => setIsCreatorOnboardingOpen(true)}
                onNavigateToFDE={() => {
                  handleOpenAuthorProfile('fde-linran');
                }}
                userRole={userRole}
                sessionLeads={sessionConsultationLeads}
                onOpenRecharge={() => setIsRechargeOpen(true)}
                focusOrderId={navigationFocus?.orderId}
                onFocusConsumed={clearNavigationFocus}
                onBack={
                  creatorCenterBackRoute
                    ? () => {
                        setCurrentRoute(creatorCenterBackRoute);
                        setCreatorCenterBackRoute(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    : undefined
                }
                backLabel={
                  creatorCenterBackRoute === 'fde-experts' ? '返回 AI 专家库' : '返回'
                }
              />
            </div>
          )}

          {currentRoute === 'creator-center' && !isExpertRole(userRole) && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <PersonalCenterView
                userRole={userRole}
                onOpenBecomeExpert={() => setIsCreatorOnboardingOpen(true)}
                onOpenRecharge={() => setIsRechargeOpen(true)}
              />
            </div>
          )}

          {/* ROUTE: 买家「我的定制」（履约流程） */}
          {currentRoute === 'orders' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <OrderCenterView
                focusOrderId={navigationFocus?.orderId}
                onFocusConsumed={clearNavigationFocus}
              />
            </div>
          )}

          {/* ROUTE: 买家「订单中心」（消费账单，独立于我的定制） */}
          {currentRoute === 'order-center' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <BuyerOrderBillingView />
            </div>
          )}

          {/* ROUTE 4: Workspace */}
          {currentRoute === 'workspace' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <WorkspaceView
                focusInstanceId={navigationFocus?.instanceId}
                onFocusConsumed={clearNavigationFocus}
                onNavigateToHome={() => {
                  setCurrentRoute('hellome-home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onTryAgentItem={(agent) => {
                  openInWorkbench(agent);
                }}
                onOpenAgentDetail={handleOpenAgentDetail}
                onRunExclusiveAgent={(inst) => {
                  const owned = catalog.homeAgents.find((item) => item.id === inst.baseAgentId);
                  if (owned) {
                    openInWorkbench(owned);
                    return;
                  }
                  const baseAgent = catalog.solutions.find((a) => a.id === inst.baseAgentId);
                  if (baseAgent) handleTryAgent(baseAgent);
                }}
                favoriteAgentIds={favoriteAgentIds}
                likedAgentIds={likedAgentIds}
              />
            </div>
          )}

          {/* ROUTE 6: API Key Manager */}
          {currentRoute === 'apikey' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <ApiKeyView />
            </div>
          )}
        </main>
      </div>

      {/* Global Interactive Drawers and Modals */}
      <AgentTestDrawer
        agent={activeTestAgent}
        isOpen={isTestDrawerOpen}
        onClose={() => setIsTestDrawerOpen(false)}
        onConsultFDE={(agent, initialPrompt) => {
          setIsTestDrawerOpen(false);
          handleConsultAgentCustomization(agent, initialPrompt);
        }}
        onViewAuthorProfile={(authorId) => {
          setIsTestDrawerOpen(false);
          handleOpenAuthorProfile(authorId);
        }}
      />

      <ConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        targetExpert={consultationTargetExpert}
        referenceAgent={consultationReferenceAgent}
        availableAgents={catalog.solutions}
        initialPrompt={consultationInitialPrompt}
        initialProjectIds={consultationInitialProjectIds}
        defaultContactName={userRole === 'normal' ? '普通用户' : '林然'}
        defaultContactPhone={userRole === 'normal' ? '13800008000' : '18800006699'}
        onSubmitSuccess={handleConsultationSubmitSuccess}
      />

      <ConsultationMessagesDrawer
        isOpen={isMessagesDrawerOpen}
        onClose={() => {
          setIsMessagesDrawerOpen(false);
          void refreshUnreadCount();
        }}
        leads={sessionConsultationLeads}
        onNavigate={handleNotificationNavigate}
        onUnreadChange={() => void refreshUnreadCount()}
        onOpenAllMessages={(tab) => {
          setMessagesInitialTab(tab);
          setIsMessagesDrawerOpen(false);
          setActiveAuthorId(null);
          leaveAgentDetailRoute();
          leaveInspirationRoute();
          setCurrentRoute('messages');
          void refreshUnreadCount();
          window.scrollTo({ top: 0 });
        }}
      />
      {consultDealId && (
        <ConsultDealDrawer
          dealId={consultDealId}
          sessionLeads={sessionConsultationLeads}
          onClose={() => setConsultDealId(null)}
          onBecameOrder={(orderId) => {
            setConsultDealId(null);
            setNavigationFocus({ orderId });
            setCurrentRoute('orders');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
      <CreatorOnboardingModal
        isOpen={isCreatorOnboardingOpen}
        onClose={() => setIsCreatorOnboardingOpen(false)}
        onApplicationSubmitted={() => {
          showToast('申请已提交后台，运营审核通过后生效');
          catalog.refresh();
        }}
      />

      {/* 身份调试：仅开发环境，普通用户 / AI 专家 */}
      {process.env.NODE_ENV === 'development' && (
      <CreatorDebugPanelModal
        isOpen={isCreatorDebugOpen}
        onClose={() => setIsCreatorDebugOpen(false)}
        userRole={userRole}
        onSelectUserRole={(role) => {
          handleSwitchUserRole(role);
          if (role === 'normal') {
            setCurrentRoute('workspace');
          } else {
            setCurrentRoute('creator-center');
          }
        }}
        onNavigateSubTab={(subTab) => {
          if (userRole === 'normal') handleSwitchUserRole('expert');
          setCreatorCenterTab(subTab as CreatorCenterTab);
          setCurrentRoute('creator-center');
        }}
        onOpenBecomeCreator={() => {
          setIsCreatorDebugOpen(false);
          setIsCreatorOnboardingOpen(true);
        }}
      />
      )}

      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
      />

      {saveToastVisible && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg">
          {saveToastMessage}
        </div>
      )}

      <DemoModeBar onOpenAdmin={() => setShowAdmin(true)} />
    </div>
  );
}
