import React, { useEffect, useState } from 'react';
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
import { ConsultationMessagesDrawer, mockUserNotifications } from './components/ConsultationMessagesDrawer';
import { RechargeModal } from './components/RechargeModal';
import { CreatorCenterView, CreatorCenterTab } from './components/CreatorCenterView';
import { CreatorOnboardingModal } from './components/CreatorOnboardingModal';
import { CreatorDebugPanelModal } from './components/CreatorDebugPanelModal';
import { UserIdentityRole, CustomerLeadItem, ConsultationMessage } from './types/creator';
import { FavoritesView } from './components/FavoritesView';
import { ExpertsCatalogView } from './components/ExpertsCatalogView';
import { AgentDetailView } from './components/AgentDetailView';
import { FDEIntroView } from './components/FDEIntroView';
import { DemoModeBar } from './components/DemoModeBar';
import { AdminApp } from './admin/AdminApp';
import { useCatalog } from './lib/catalog';
import { api } from './lib/api';
import { ensureMarketplaceSession } from './lib/marketplaceAuth';

import {
  mockCaseStudies,
  HellomeAgentItem
} from './data/mockData';
import { FDEExpert, AgentSolution, ConsultationFormState } from './types';
import { isExpertRole } from './utils/expertIdentity';

export default function App() {
  const catalog = useCatalog();
  const [showAdmin, setShowAdmin] = useState(false);

  // Global sidebar route: 'hellome-home' | 'author-profile' | 'creator-center' | 'workspace' | 'account' | 'apikey'
  const [currentRoute, setCurrentRoute] = useState<MainNavRoute | 'author-profile' | 'agent-detail'>('hellome-home');
  const [creatorCenterTab, setCreatorCenterTab] = useState<CreatorCenterTab>('my-agents');
  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Agent interactive trial drawer state
  const [activeTestAgent, setActiveTestAgent] = useState<AgentSolution | null>(null);
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);

  // Consultation modal & in-platform chat workspace
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationTargetExpert, setConsultationTargetExpert] = useState<FDEExpert | null>(null);
  const [consultationReferenceAgent, setConsultationReferenceAgent] = useState<AgentSolution | null>(null);
  const [consultationInitialPrompt, setConsultationInitialPrompt] = useState<string>('');

  // 咨询提交后写入创作者中心「定制服务」，进度通过消息提醒通知用户
  const [sessionConsultationLeads, setSessionConsultationLeads] = useState<CustomerLeadItem[]>([]);
  const [isMessagesDrawerOpen, setIsMessagesDrawerOpen] = useState(false);
  const [apiUnreadCount, setApiUnreadCount] = useState(0);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState('操作已完成');

  const showToast = (message: string) => {
    setSaveToastMessage(message);
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 2800);
  };

  // Favorites & Likes
  const [favoriteExpertIds, setFavoriteExpertIds] = useState<string[]>(['fde-linran', 'fde-maya']);
  const [favoriteAgentIds, setFavoriteAgentIds] = useState<string[]>([
    'hz-canvas',
    'geo-helper',
    'doc-emergency'
  ]);
  const [likedAgentIds, setLikedAgentIds] = useState<string[]>([
    'hz-canvas',
    'doc-emergency'
  ]);
  const [favoritesInitialTab, setFavoritesInitialTab] = useState<'agents' | 'experts'>('agents');
  const [creatorCenterBackRoute, setCreatorCenterBackRoute] = useState<MainNavRoute | null>(null);

  // Agent detail page（页内打开，非弹窗）
  const [activeDetailAgent, setActiveDetailAgent] = useState<HellomeAgentItem | null>(null);
  const [agentDetailBackRoute, setAgentDetailBackRoute] = useState<MainNavRoute>('hellome-home');

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

  useEffect(() => {
    void refreshUnreadCount();
  }, [userRole, isMessagesDrawerOpen]);

  const handleSwitchUserRole = (role: UserIdentityRole) => {
    setUserRole(role === 'normal' ? 'normal' : 'expert');
  };

  // Active Author object
  const activeAuthor = catalog.experts.find((e) => e.id === activeAuthorId) || catalog.experts[0];

  // Navigate to Author Profile Page (triggered when clicking author name)
  const handleOpenAuthorProfile = (authorId: string) => {
    setActiveAuthorId(authorId);
    setCurrentRoute('author-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Agent Detail page in main content
  const handleOpenAgentDetail = (agent: HellomeAgentItem) => {
    const from =
      currentRoute === 'agent-detail' || currentRoute === 'author-profile'
        ? agentDetailBackRoute
        : (currentRoute as MainNavRoute);
    setAgentDetailBackRoute(from);
    setActiveDetailAgent(agent);
    setCurrentRoute('agent-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromAgentDetail = () => {
    setCurrentRoute(agentDetailBackRoute);
    setActiveDetailAgent(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Like state on Agent
  const handleToggleLikeAgent = (agentId: string) => {
    setLikedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleBackToHome = () => {
    setCurrentRoute('hellome-home');
    setActiveAuthorId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Live Agent Test Drawer for AgentSolution
  const handleTryAgent = (agent: AgentSolution) => {
    setActiveTestAgent(agent);
    setIsTestDrawerOpen(true);
  };

  // Trigger Consultation for specific FDE
  const handleOpenConsultExpert = (expert: FDEExpert, initialPrompt?: string) => {
    setConsultationTargetExpert(expert);
    setConsultationReferenceAgent(null);
    setConsultationInitialPrompt(initialPrompt || '');
    setIsConsultationModalOpen(true);
  };

  // Trigger Consultation from an Agent Card
  const handleConsultAgentCustomization = (agent: AgentSolution, initialPrompt?: string) => {
    const author = catalog.experts.find((e) => e.id === agent.authorId) || catalog.experts[0];
    setConsultationTargetExpert(author);
    setConsultationReferenceAgent(agent);
    setConsultationInitialPrompt(
      initialPrompt || `咨询「${agent.title}」的技术接入与服务方案`
    );
    setIsConsultationModalOpen(true);
  };

  // When user submits consultation form -> Enter Platform Escrow IM Room + 写入线索
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
    setSessionConsultationLeads((prev) => [newLead, ...prev]);

    if (catalog.source === 'api') {
      import('./lib/marketplaceAuth').then(({ ensureMarketplaceSession }) =>
        ensureMarketplaceSession()
          .then(() =>
            api('/api/consultations', {
              method: 'POST',
              body: JSON.stringify({
                ...data,
                expertId: consultationTargetExpert?.id,
                createCustomOrder: Boolean(data.customizationSpec && data.agentId),
                baseAgentVersion: data.standardVersionAtRequest || 'v1.0.0'
              })
            })
          )
          .then(() => {
            showToast(
              data.customizationSpec && data.agentId
                ? '已创建定制订单；创作者接单后将分叉专属实例，运营审核通过后才会推送给你'
                : '定制需求已保存，有进展时会通过消息提醒你'
            );
          })
          .catch(() => undefined)
      );
    }

    setIsConsultationModalOpen(false);
    setIsTestDrawerOpen(false);
    if (catalog.source !== 'api') {
      showToast('定制需求已保存，有进展时会通过消息提醒你');
    }
  };

  const hellomeItemToSolution = (agent: HellomeAgentItem): AgentSolution => {
    const existing =
      catalog.solutions.find((a) => a.id === agent.id) ||
      catalog.solutions.find((a) => a.title === agent.title);
    if (existing) return existing;
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
      demoConversation: []
    };
  };

  // 从智能体详情发起定制：已选定基础智能体，直接进入表单
  const handleCustomizeFromHellomeAgent = (agent: HellomeAgentItem) => {
    handleConsultAgentCustomization(hellomeItemToSolution(agent));
  };

  const handleToggleFavoriteExpert = (expertId: string) => {
    setFavoriteExpertIds((prev) =>
      prev.includes(expertId) ? prev.filter((id) => id !== expertId) : [...prev, expertId]
    );
  };

  const handleToggleFavoriteAgent = (agentId: string) => {
    setFavoriteAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
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
          currentRoute === 'author-profile' || currentRoute === 'agent-detail'
            ? 'hellome-home'
            : currentRoute
        }
        onNavigate={(route) => {
          if (route === 'account') {
            setCreatorCenterTab('account');
            setCurrentRoute('creator-center');
            setActiveAuthorId(null);
            setActiveDetailAgent(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          setCurrentRoute(route);
          setActiveAuthorId(null);
          setActiveDetailAgent(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        fdeExpertCount={catalog.experts.length}
        favoritesCount={favoriteAgentIds.length + favoriteExpertIds.length}
        onOpenBecomeCreator={() => setIsCreatorOnboardingOpen(true)}
        onOpenMyExpertHome={() => {
          setCreatorCenterBackRoute('fde-experts');
          setCurrentRoute('creator-center');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentRole={userRole}
      />

      {/* 2. Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-18' : 'ml-56'
        }`}
      >
        {/* Top Header */}
        <TopHeader
          currentRoute={currentRoute}
          onNavigate={(route) => {
            if (route === 'account') {
              setCreatorCenterTab('account');
              setCurrentRoute('creator-center');
              setActiveAuthorId(null);
              setActiveDetailAgent(null);
              return;
            }
            setCurrentRoute(route);
            setActiveAuthorId(null);
            setActiveDetailAgent(null);
            if (route !== 'creator-center') setCreatorCenterBackRoute(null);
          }}
          activeAuthorName={activeAuthor?.name}
          activeAgentTitle={activeDetailAgent?.title}
          onBackToHome={
            currentRoute === 'agent-detail' ? handleBackFromAgentDetail : handleBackToHome
          }
          onOpenRechargeModal={() => setIsRechargeOpen(true)}
          unreadCount={
            apiUnreadCount +
            mockUserNotifications.filter((n) => n.unread).length +
            sessionConsultationLeads.length
          }
          favoriteAgentCount={favoriteAgentIds.length}
          favoriteExpertCount={favoriteExpertIds.length}
          onOpenFavorites={(tab) => {
            setFavoritesInitialTab(tab);
            setCurrentRoute('favorites');
            setActiveAuthorId(null);
            setActiveDetailAgent(null);
          }}
          onOpenBecomeCreator={() => setIsCreatorOnboardingOpen(true)}
          userRole={userRole}
          onToggleUserRole={(role) => handleSwitchUserRole(role)}
          onOpenConsultationDrawer={() => setIsMessagesDrawerOpen(true)}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 w-full">
          {/* ROUTE 1: Hellome Home */}
          {currentRoute === 'hellome-home' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <HellomeHomeView
                onOpenAuthorProfile={handleOpenAuthorProfile}
                onOpenAgentDetail={handleOpenAgentDetail}
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
          {(currentRoute === 'fde-intro' ||
            (currentRoute === 'creator-center' && !isExpertRole(userRole))) && (
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
                handleTryAgent(hellomeItemToSolution(agent));
              }}
              isFavorite={favoriteAgentIds.includes(activeDetailAgent.id)}
              onToggleFavorite={handleToggleFavoriteAgent}
              isLiked={likedAgentIds.includes(activeDetailAgent.id)}
              onToggleLike={handleToggleLikeAgent}
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

          {/* ROUTE 3: Creator Center（仅 AI 专家；普通用户走入驻介绍页） */}
          {currentRoute === 'creator-center' && isExpertRole(userRole) && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <CreatorCenterView
                key={creatorCenterTab}
                initialTab={creatorCenterTab}
                onOpenOnboardingModal={() => setIsCreatorOnboardingOpen(true)}
                onOpenBecomeCreator={() => setIsCreatorOnboardingOpen(true)}
                onNavigateToFDE={() => {
                  handleOpenAuthorProfile('fde-linran');
                }}
                userRole={userRole}
                sessionLeads={sessionConsultationLeads}
                onOpenRecharge={() => setIsRechargeOpen(true)}
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

          {/* ROUTE: 买家「我的定制」（履约流程） */}
          {currentRoute === 'orders' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <OrderCenterView />
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
                onNavigateToHome={() => {
                  setCurrentRoute('hellome-home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onTryAgentItem={(agent) => {
                  handleOpenAuthorProfile(agent.authorId || 'fde-linran');
                }}
                onOpenAgentDetail={handleOpenAgentDetail}
                onRunExclusiveAgent={(inst) => {
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
      />
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
