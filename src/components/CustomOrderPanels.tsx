import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  FileText,
  Handshake,
  MessageSquare,
  UploadCloud
} from 'lucide-react';
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
  paymentStatusText,
  yuan
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <MessageSquare size={15} className="text-blue-600" />
            咨询单管理
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            用户提出需求、尚未付款。付款后自动生成订单，咨询单记录会保留并链接到订单。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {CONSULT_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  filter === f.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void reload()} className="text-[11px] text-blue-600 font-bold cursor-pointer shrink-0">
            刷新
          </button>
        </div>
      </div>
      {filtered.length === 0 && <p className="text-xs text-slate-500">暂无咨询单。</p>}
      {filtered.map((deal) => {
        const consult = consultListStatus(deal);
        const converted = consult.key === 'converted';
        const orderId = deal.orderId || deal.order?.id || '';
        return (
          <div key={deal.dealId} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">
                  {deal.clientName}
                  {deal.clientCompany ? ` · ${deal.clientCompany}` : ''}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {deal.agentTitle || deal.order?.baseAgentTitle || '未指定智能体'}
                  {deal.consultedAt ? ` · ${formatOrderTime(deal.consultedAt)}` : ''}
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">{deal.requirement || '暂无需求描述'}</p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  converted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {consult.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOpenDealId(deal.dealId)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Handshake size={14} />
                {consult.key === 'pending_accept' ? '接单处理' : '查看沟通'}
              </button>
              {converted && orderId && (
                <button
                  type="button"
                  onClick={() => onOpenOrder?.(orderId)}
                  className="px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold cursor-pointer"
                >
                  查看对应订单
                </button>
              )}
            </div>
          </div>
        );
      })}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Package size={15} className="text-blue-600" />
            订单管理
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            仅处理已付款项目：直接购买的标准商品，以及由咨询单转化的定制订单。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {FULFILLMENT_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  filter === f.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void reload()} className="text-[11px] text-blue-600 font-bold cursor-pointer shrink-0">
            刷新
          </button>
        </div>
      </div>
      {filtered.length === 0 && (
        <p className="text-xs text-slate-500">暂无已付款订单。咨询单付款后会自动出现在这里。</p>
      )}
      {filtered.map((deal) => {
        const order = deal.order;
        const hasPrice = (order?.priceCents || 0) > 0;
        const proposal = order?.deliveryProposal as DeliveryProposal | undefined;
        const fulfill = fulfillmentListStatus(order?.status);
        const canViewProposal = hasViewableProposal(proposal);
        const isFocused =
          focusOrderId &&
          (deal.orderId === focusOrderId ||
            deal.order?.id === focusOrderId ||
            deal.dealId === focusOrderId);
        return (
          <div
            key={deal.dealId}
            id={deal.order?.id ? `creator-order-${deal.order.id}` : undefined}
            className={`p-3.5 rounded-2xl border bg-white space-y-3 ${
              isFocused ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900">
                  {deal.clientName || order?.buyer?.name || '购买用户'}
                  {deal.clientCompany ? ` · ${deal.clientCompany}` : ''}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {order?.orderNo || '订单'} · {deal.agentTitle || order?.baseAgentTitle || '未指定智能体'}
                  {order?.baseAgentVersion ? ` ${order.baseAgentVersion}` : ''}
                </div>
                {selectedProjectsFromOrder(order).length > 0 && (
                  <div className="text-[11px] text-slate-600 mt-1">
                    商品 / 定制项目：
                    {selectedProjectsFromOrder(order)
                      .map((item) => `${item.title}${item.price ? ` ¥${item.price}` : ''}`)
                      .join('、')}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                  {order?.createdAt && <div>下单时间 · {formatOrderTime(order.createdAt)}</div>}
                  {order?.paidAt && <div>付款时间 · {formatOrderTime(order.paidAt)}</div>}
                  {order?.acceptanceDeadlineAt && (
                    <div>验收截止 · {formatOrderTime(order.acceptanceDeadlineAt)}</div>
                  )}
                  {order?.deliveryDays ? <div>交付期限 · {order.deliveryDays} 天</div> : null}
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1.5">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {fulfill.label}
                </span>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wide">已支付金额</div>
                  <div
                    className={`text-lg font-black tabular-nums leading-tight ${
                      hasPrice ? 'text-amber-600' : 'text-slate-300'
                    }`}
                  >
                    {hasPrice ? yuan(order?.priceCents) : '—'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    托管 {paymentStatusText[order?.paymentStatus || ''] || paymentStatusText.none}
                  </div>
                </div>
              </div>
            </div>
            {(order?.serviceScope || order?.quoteNote) && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                服务方案：{order.serviceScope || order.quoteNote}
              </p>
            )}
            {order?.instance && (
              <p className="text-[11px] text-slate-600">
                当前交付版本：{order.instance.title}
                {order.instance.currentVersion ? ` · ${order.instance.currentVersion}` : ''}
              </p>
            )}
            {order?.deliveries?.[0]?.rejectReason && (
              <p className="text-[11px] text-rose-600">驳回：{order.deliveries[0].rejectReason}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {canViewProposal && (
                <button
                  type="button"
                  onClick={() => setViewProposalDeal(deal)}
                  className="px-3.5 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-xs font-bold cursor-pointer flex items-center gap-1.5 hover:bg-violet-100"
                >
                  <FileText size={14} />
                  查看方案
                </button>
              )}
              {order && canUploadSkill(order.status) && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => setDeliveryDeal(deal)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-60 shadow-sm shadow-indigo-600/20"
                >
                  <UploadCloud size={14} />
                  上传交付版本
                </button>
              )}
            </div>
          </div>
        );
      })}

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
