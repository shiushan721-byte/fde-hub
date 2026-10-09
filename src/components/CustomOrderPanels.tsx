import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import {
  CONSULT_FILTERS,
  ConsultFilterKey,
  FULFILLMENT_FILTERS,
  FulfillmentFilterKey,
  consultListStatus,
  formatOrderTime,
  fulfillmentListStatus,
  isPaidFulfillmentDeal,
  matchesConsultFilter,
  matchesFulfillmentFilter,
} from '../lib/customOrderLabels';
import {
  DeliveryProposalModal,
  DeliveryProposalReviewPanel,
  hasViewableProposal
} from './DeliveryProposalReviewPanel';
import { DeliveryProposal } from '../types/deliveryProposal';
import { CustomServiceDeal, CustomServiceOrder } from '../types/customService';
import { CustomerLeadItem, CreatorAgentItem } from '../types/creator';
import { AgentPublishWizardModal } from './AgentPublishWizardModal';
import { ConsultDealDrawer } from './ConsultDealDrawer';

type OrderRow = CustomServiceOrder;

function selectedProjectsFromOrder(order?: OrderRow | null) {
  const spec = order?.customizationSpec;
  if (!spec || typeof spec !== 'object') return [];
  const rows = (spec as { selectedProjects?: Array<{ title?: string; price?: number }> }).selectedProjects;
  return Array.isArray(rows) ? rows.filter((row) => row?.title) : [];
}

function useCreatorDeals(sessionLeads: CustomerLeadItem[]) {
  const [deals, setDeals] = useState<CustomServiceDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      await ensureMarketplaceSession();
      try {
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'fde-linran@experts.hellome.art',
            password: 'hellome-expert'
          })
        });
      } catch {
        /* keep current session */
      }
      const data = await api<CustomServiceDeal[]>('/api/custom-services/creator');
      const existingIds = new Set(data.map((d) => d.dealId));
      const extra: CustomServiceDeal[] = sessionLeads
        .filter((lead) => !existingIds.has(lead.id))
        .map((lead) => ({
          dealId: lead.id,
          leadId: lead.id,
          orderId: null,
          stageKey: 'consulting' as const,
          stageLabel: '咨询中',
          clientName: lead.clientName,
          clientCompany: lead.clientCompany,
          clientAvatar: lead.clientAvatar,
          agentId: lead.agentId,
          agentTitle: lead.agentTitle,
          standardVersionAtRequest: lead.standardVersionAtRequest,
          requirement: lead.notes || lead.customizationSummary || '',
          leadStatus: lead.status,
          consultedAt: lead.consultedAt,
          order: null
        }));
      setDeals([...extra, ...data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [sessionLeads]);

  return { deals, loading, error, reload };
}

/** 咨询单：尚未付款的定制需求，已转订单仍保留记录 */
export const CreatorConsultationsPanel: React.FC<{
  sessionLeads?: CustomerLeadItem[];
  focusDealId?: string;
  onFocusConsumed?: () => void;
  onOpenOrder?: (orderId: string) => void;
}> = ({ sessionLeads = [], focusDealId, onFocusConsumed, onOpenOrder }) => {
  const { deals, loading, error, reload } = useCreatorDeals(sessionLeads);
  const [filter, setFilter] = useState<ConsultFilterKey>('all');
  const [openDealId, setOpenDealId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusDealId || loading) return;
    const deal = deals.find(
      (d) => d.dealId === focusDealId || d.leadId === focusDealId || d.orderId === focusDealId
    );
    if (deal) setOpenDealId(deal.dealId);
    onFocusConsumed?.();
  }, [focusDealId, loading, deals, onFocusConsumed]);

  const filtered = useMemo(
    () => deals.filter((d) => matchesConsultFilter(d, filter)),
    [deals, filter]
  );

  if (loading) return <p className="text-sm text-slate-500">加载咨询单…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {CONSULT_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`h-8 px-3 rounded-lg text-xs cursor-pointer ${
              filter === f.key ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">定制用户</th>
              <th className="px-4 py-3 font-medium">联系方式</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">智能体</th>
              <th className="px-4 py-3 font-medium">定制项目</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-slate-400">暂无咨询单。</td>
              </tr>
            )}
            {filtered.map((deal) => {
              const consult = consultListStatus(deal);
              const converted = consult.key === 'converted';
              const orderId = deal.orderId || deal.order?.id || '';
              const lead = sessionLeads.find((item) => item.id === deal.leadId || item.id === deal.dealId);
              return (
                <tr key={deal.dealId} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {deal.clientAvatar ? (
                        <img src={deal.clientAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-slate-200" />
                      )}
                      <span className="text-slate-800">{deal.clientName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{lead?.contactPhone || deal.clientCompany || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{deal.consultedAt ? formatOrderTime(deal.consultedAt) : '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700">{deal.agentTitle || deal.order?.baseAgentTitle || '未指定智能体'}</td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-[220px] truncate">{deal.requirement || '暂无需求描述'}</td>
                  <td className={`px-4 py-3.5 whitespace-nowrap ${converted ? 'text-slate-400' : 'text-slate-700'}`}>{consult.label}</td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setOpenDealId(deal.dealId)}
                      className="h-7 px-2.5 rounded-md bg-slate-900 text-white text-xs cursor-pointer mr-2"
                    >
                      {consult.key === 'pending_accept' ? '接单' : '沟通'}
                    </button>
                    {converted && orderId && (
                      <button
                        type="button"
                        onClick={() => onOpenOrder?.(orderId)}
                        className="h-7 px-2.5 rounded-md border border-slate-200 text-xs cursor-pointer"
                      >
                        订单
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {openDealId && (
        <ConsultDealDrawer
          dealId={openDealId}
          sessionLeads={sessionLeads}
          onClose={() => {
            setOpenDealId(null);
            void reload();
          }}
          onBecameOrder={(orderId) => {
            setOpenDealId(null);
            onOpenOrder?.(orderId);
          }}
        />
      )}
    </div>
  );
};

/** 订单管理：已付款、需要交付的标准商品与定制订单 */
export const CreatorCustomOrdersPanel: React.FC<{
  sessionLeads?: CustomerLeadItem[];
  focusOrderId?: string;
  onFocusConsumed?: () => void;
}> = ({ sessionLeads = [], focusOrderId, onFocusConsumed }) => {
  const { deals, loading, error, reload } = useCreatorDeals(sessionLeads);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState<FulfillmentFilterKey>('all');
  const [deliveryDeal, setDeliveryDeal] = useState<CustomServiceDeal | null>(null);
  const [viewProposalDeal, setViewProposalDeal] = useState<CustomServiceDeal | null>(null);

  useEffect(() => {
    if (!focusOrderId || loading) return;
    const deal = deals.find(
      (d) => d.orderId === focusOrderId || d.order?.id === focusOrderId || d.dealId === focusOrderId
    );
    if (!deal) return;
    if (deal.order && hasViewableProposal(deal.order.deliveryProposal as DeliveryProposal)) {
      setViewProposalDeal(deal);
    }
    requestAnimationFrame(() => {
      const scrollId = deal.order?.id || focusOrderId;
      document.getElementById(`creator-order-${scrollId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
    onFocusConsumed?.();
  }, [focusOrderId, loading, deals, onFocusConsumed]);

  const filtered = useMemo(
    () =>
      deals.filter(
        (d) => isPaidFulfillmentDeal(d) && matchesFulfillmentFilter(d.order?.status, filter)
      ),
    [deals, filter]
  );

  const submitSkillDelivery = async (
    order: OrderRow,
    agentData: { version?: string; title?: string; desc?: string; skillPackage?: { fileName?: string } }
  ) => {
    const result = await api<{ hermes: { passed: boolean; report: { issues: string[] } } }>(
      `/api/custom-orders/${order.id}/submit-delivery`,
      {
        method: 'POST',
        body: JSON.stringify({
          version: agentData.version || order.instance?.currentVersion || 'v1.0.0',
          changelog: '已上传 Skill 包，提交平台审核。',
          completedItems: [order.title].filter(Boolean),
          skillPayload: {
            skillFileName: agentData.skillPackage?.fileName || 'customer_fork.zip',
            agentTitle: agentData.title || order.instance?.title || order.baseAgentTitle,
            agentDesc: (agentData.desc || '').trim(),
            promptOverrides: true
          }
        })
      }
    );
    if (!result.hermes.passed) {
      throw new Error(`Hermes 校验未通过：${result.hermes.report.issues.join('；')}`);
    }
    await reload();
    alert('Skill 已提交，订单进入平台审核中。');
  };

  const canUploadSkill = (status: string) =>
    ['paid_pending_start', 'escrowed', 'in_development', 'revision'].includes(status);

  if (loading) return <p className="text-sm text-slate-500">加载订单…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {FULFILLMENT_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`h-8 px-3 rounded-lg text-xs cursor-pointer ${
              filter === f.key ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">定制用户</th>
              <th className="px-4 py-3 font-medium">联系方式</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">交易单号</th>
              <th className="px-4 py-3 font-medium">智能体</th>
              <th className="px-4 py-3 font-medium">定制类型</th>
              <th className="px-4 py-3 font-medium">需求详情</th>
              <th className="px-4 py-3 font-medium text-right">价格</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-xs text-slate-400">暂无已付款订单。咨询单付款后会自动出现在这里。</td>
              </tr>
            )}
            {filtered.map((deal) => {
              const order = deal.order;
              const hasPrice = (order?.priceCents || 0) > 0;
              const proposal = order?.deliveryProposal as DeliveryProposal | undefined;
              const fulfill = fulfillmentListStatus(order?.status);
              const canViewProposal = hasViewableProposal(proposal);
              const projects = selectedProjectsFromOrder(order);
              const lead = sessionLeads.find((item) => item.id === deal.leadId || item.id === deal.dealId);
              const rejected = Boolean(order?.deliveries?.[0]?.rejectReason);
              return (
                <tr
                  key={deal.dealId}
                  id={deal.order?.id ? `creator-order-${deal.order.id}` : undefined}
                  className="border-b border-slate-50 last:border-0"
                >
                  <td className="px-4 py-3.5 text-slate-800">{deal.clientName || order?.buyer?.name || '购买用户'}</td>
                  <td className="px-4 py-3.5 text-slate-500">{lead?.contactPhone || deal.clientCompany || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{order?.createdAt ? formatOrderTime(order.createdAt) : '—'}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{order?.orderNo || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700">{deal.agentTitle || order?.baseAgentTitle || '未指定智能体'}</td>
                  <td className="px-4 py-3.5 text-slate-600">{projects.length > 0 || deal.requirement ? '自定义' : '标准'}</td>
                  <td className="px-4 py-3.5 text-blue-600 max-w-[180px] truncate">
                    {projects.map((item) => item.title).join('、') || deal.requirement || order?.serviceScope || '查看'}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-800">{hasPrice ? ((order?.priceCents || 0) / 100).toFixed(2) : '—'}</td>
                  <td className={`px-4 py-3.5 whitespace-nowrap ${rejected ? 'text-rose-500' : 'text-slate-600'}`}>
                    {rejected ? '被驳回' : fulfill.label}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {canViewProposal && (
                      <button
                        type="button"
                        onClick={() => setViewProposalDeal(deal)}
                        className="h-7 px-2.5 rounded-md bg-slate-900 text-white text-xs cursor-pointer mr-2"
                      >
                        查看方案
                      </button>
                    )}
                    {order && canUploadSkill(order.status) && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => setDeliveryDeal(deal)}
                        className="h-7 px-2.5 rounded-md bg-slate-900 text-white text-xs cursor-pointer disabled:opacity-60"
                      >
                        上传Skill
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewProposalDeal?.order && hasViewableProposal(viewProposalDeal.order.deliveryProposal) && (
        <DeliveryProposalModal
          isOpen
          onClose={() => setViewProposalDeal(null)}
          title={`定制交付方案 · ${viewProposalDeal.order.orderNo}`}
        >
          <DeliveryProposalReviewPanel
            proposal={viewProposalDeal.order.deliveryProposal as DeliveryProposal}
            proposalVersion={viewProposalDeal.order.proposalVersion}
            proposalSubmittedAt={viewProposalDeal.order.proposalSubmittedAt}
            readOnly
            statusHint={viewProposalDeal.stageLabel}
          />
        </DeliveryProposalModal>
      )}

      {deliveryDeal?.order && (
        <AgentPublishWizardModal
          isOpen
          mode="custom_delivery"
          skillReplaceHint={`正在为【${deliveryDeal.order.instance?.title || deliveryDeal.order.baseAgentTitle}】上传定制 Skill 包，校验通过后将进入平台审核`}
          agentToUpdate={
            {
              title: deliveryDeal.order.instance?.title || deliveryDeal.order.baseAgentTitle,
              desc: deliveryDeal.requirement || deliveryDeal.order.title,
              version: deliveryDeal.order.instance?.currentVersion || '1.0.0',
              platformSupport: 'both'
            } as CreatorAgentItem
          }
          onClose={() => setDeliveryDeal(null)}
          onSuccessPublish={async (agentData) => {
            await submitSkillDelivery(deliveryDeal.order!, agentData);
            setDeliveryDeal(null);
          }}
        />
      )}
    </div>
  );
};

/** 用户侧：已推送的专属智能体（进度见「我的定制」） */
export const BuyerExclusiveAgentsPanel: React.FC<{
  focusInstanceId?: string;
  onFocusConsumed?: () => void;
}> = ({ focusInstanceId, onFocusConsumed }) => {
  const [items, setItems] = useState<
    Array<{
      id: string;
      title: string;
      currentVersion: string;
      orderId: string;
      orderNo: string;
      orderStatus: string;
      acceptanceDeadlineAt?: string;
      baseAgentTitle: string;
      baseAgentVersion: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await ensureMarketplaceSession();
        const instances = await api<typeof items>('/api/custom-orders/workspace/instances');
        setItems(instances);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!focusInstanceId || loading || items.length === 0) return;
    requestAnimationFrame(() => {
      document.getElementById(`workspace-instance-${focusInstanceId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
    onFocusConsumed?.();
  }, [focusInstanceId, loading, items.length, onFocusConsumed]);

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-slate-500">加载中…</p>}
      {!loading && items.length === 0 && (
        <p className="text-xs text-slate-500">暂无已推送的专属智能体。</p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          id={`workspace-instance-${item.id}`}
          className={`p-3 rounded-xl border text-xs ${
            focusInstanceId === item.id
              ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
              : 'border-blue-100 bg-blue-50/40'
          }`}
        >
          <div className="font-bold text-slate-900">{item.title}</div>
          <div className="text-slate-600 mt-0.5">
            {item.currentVersion} · 基于 {item.baseAgentTitle} {item.baseAgentVersion} · 仅您可用
          </div>
        </div>
      ))}
    </div>
  );
};
