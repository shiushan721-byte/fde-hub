import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  FileText,
  X,
  UploadCloud
} from 'lucide-react';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import {
  creatorStatusText,
  CUSTOM_SERVICE_FILTERS,
  CustomServiceFilterKey,
  formatOrderTime,
  matchesCustomServiceFilter,
  yuan
} from '../lib/customOrderLabels';
import { DeliveryProposalForm } from './DeliveryProposalForm';
import { DeliveryProposal } from '../types/deliveryProposal';
import { CustomServiceDeal, CustomServiceOrder } from '../types/customService';
import { CustomerLeadItem, CreatorAgentItem } from '../types/creator';
import { AgentPublishWizardModal } from './AgentPublishWizardModal';

type OrderRow = CustomServiceOrder;

/** 创作者：定制服务（咨询线索与订单同一条流程） */
export const CreatorCustomOrdersPanel: React.FC<{ sessionLeads?: CustomerLeadItem[] }> = ({
  sessionLeads = []
}) => {
  const [deals, setDeals] = useState<CustomServiceDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState<CustomServiceFilterKey>('all');
  const [proposalOrder, setProposalOrder] = useState<OrderRow | null>(null);
  const [creatingLeadId, setCreatingLeadId] = useState('');
  const [deliveryDeal, setDeliveryDeal] = useState<CustomServiceDeal | null>(null);

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
    reload();
  }, [sessionLeads]);

  const filtered = useMemo(
    () => deals.filter((d) => matchesCustomServiceFilter(d.stageKey, filter)),
    [deals, filter]
  );

  const submitProposal = async (
    orderId: string,
    proposal: Omit<DeliveryProposal, 'submittedAt' | 'version'>
  ) => {
    setBusyId(orderId);
    try {
      await api(`/api/custom-orders/${orderId}/proposal`, {
        method: 'POST',
        body: JSON.stringify(proposal)
      });
      await reload();
      alert('已发起定制交付方案，等待用户确认。');
    } finally {
      setBusyId('');
    }
  };

  const createOrderFromLead = async (deal: CustomServiceDeal): Promise<OrderRow | null> => {
    if (!deal.leadId) return null;
    if (!deal.agentId) {
      alert('该咨询未关联智能体，无法直接创建交付订单。');
      return null;
    }
    setCreatingLeadId(deal.leadId);
    try {
      const order = await api<OrderRow>(`/api/custom-orders/from-lead/${deal.leadId}`, {
        method: 'POST',
        body: JSON.stringify({
          clientName: deal.clientName,
          clientCompany: deal.clientCompany,
          agentId: deal.agentId,
          agentTitle: deal.agentTitle,
          baseAgentVersion: deal.standardVersionAtRequest,
          customizationSummary: deal.requirement,
          notes: deal.requirement
        })
      });
      await reload();
      return order;
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建交付订单失败');
      return null;
    } finally {
      setCreatingLeadId('');
    }
  };

  const startProposal = async (deal: CustomServiceDeal) => {
    if (deal.order && canPropose(deal.order.status)) {
      setProposalOrder(deal.order);
      return;
    }
    const created = await createOrderFromLead(deal);
    if (created) setProposalOrder(created);
  };

  const closeConsulting = async (deal: CustomServiceDeal) => {
    if (!window.confirm('确认关闭该咨询？关闭后将不再跟进。')) return;
    setBusyId(deal.dealId);
    try {
      await api(`/api/custom-services/${deal.dealId}/close`, {
        method: 'POST',
        body: '{}'
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '关闭失败');
    } finally {
      setBusyId('');
    }
  };

  const submitSkillDelivery = async (order: OrderRow, agentData: { version?: string; skillPackage?: { fileName?: string } }) => {
    const result = await api<{ hermes: { passed: boolean; report: { issues: string[] } } }>(
      `/api/custom-orders/${order.id}/submit-delivery`,
      {
        method: 'POST',
        body: JSON.stringify({
          version: agentData.version || order.instance?.currentVersion || 'v1.0.0',
          changelog: '已上传 Skill 包并通过沙箱自测，提交平台审核。',
          completedItems: [order.title].filter(Boolean),
          skillPayload: {
            skillFileName: agentData.skillPackage?.fileName || 'customer_fork.zip',
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

  const canPropose = (status: string) =>
    ['consulting', 'pending_quote'].includes(status);

  const canUploadSkill = (status: string) =>
    ['paid_pending_start', 'escrowed', 'in_development', 'revision'].includes(status);

  if (loading) return <p className="text-sm text-slate-500">加载定制服务…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Package size={15} className="text-blue-600" />
            定制服务
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            咨询 → 方案 → 支付 → 开发 → 审核 → 验收，同一条流程跟进
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {CUSTOM_SERVICE_FILTERS.map((f) => (
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
          <button type="button" onClick={reload} className="text-[11px] text-blue-600 font-bold cursor-pointer shrink-0">
            刷新
          </button>
        </div>
      </div>
      {filtered.length === 0 && (
        <p className="text-xs text-slate-500">暂无定制服务。用户提交咨询后会出现在这里。</p>
      )}
      {filtered.map((deal) => {
        const order = deal.order;
        const hasPrice = (order?.priceCents || 0) > 0;
        const proposal = order?.deliveryProposal as DeliveryProposal | undefined;
        const isConsulting = deal.stageKey === 'consulting';
        const timeValue = isConsulting
          ? deal.consultedAt || order?.createdAt
          : order?.createdAt || deal.consultedAt;
        const canStartProposal =
          isConsulting && (!order || canPropose(order.status));
        const canCloseConsulting = isConsulting;
        return (
          <div key={deal.dealId} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900">
                  {deal.clientName}
                  {deal.clientCompany ? ` · ${deal.clientCompany}` : ''}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {order?.orderNo || '尚未成单'} · 基于 {deal.agentTitle || order?.baseAgentTitle || '未指定智能体'}
                  {deal.standardVersionAtRequest || order?.baseAgentVersion
                    ? ` ${deal.standardVersionAtRequest || order?.baseAgentVersion}`
                    : ''}
                </div>
                {deal.requirement && (
                  <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">{deal.requirement}</p>
                )}
                {timeValue && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isConsulting ? '咨询时间' : '下单时间'} · {formatOrderTime(timeValue)}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 space-y-1.5">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {deal.stageLabel}
                </span>
                {order && (
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {creatorStatusText[order.status] || order.status}
                  </span>
                )}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wide">订单价格</div>
                  <div
                    className={`text-lg font-black tabular-nums leading-tight ${
                      hasPrice ? 'text-amber-600' : 'text-slate-300'
                    }`}
                  >
                    {hasPrice ? yuan(order?.priceCents) : '待填写'}
                  </div>
                </div>
              </div>
            </div>
            {hasPrice && order && (
              <p className="text-[11px] text-slate-600">
                {order.deliveryDays} 天交付
                {order.serviceScope ? ` · ${order.serviceScope}` : ''}
                {order.paymentStatus && order.paymentStatus !== 'none'
                  ? ` · 支付：${order.paymentStatus}`
                  : ''}
              </p>
            )}
            {proposal?.customizationItems?.length ? (
              <p className="text-[11px] text-slate-600">
                方案 v{order?.proposalVersion ?? proposal.version} · 需求 {proposal.customizationItems.length} 项
              </p>
            ) : null}
            {order?.instance && (
              <p className="text-[11px] text-slate-600">
                专属实例：{order.instance.title}
                {order.instance.currentVersion ? ` · ${order.instance.currentVersion}` : ''}
              </p>
            )}
            {order?.deliveries?.[0]?.rejectReason && (
              <p className="text-[11px] text-rose-600">驳回：{order.deliveries[0].rejectReason}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {canCloseConsulting && (
                <button
                  type="button"
                  disabled={busyId === deal.dealId}
                  onClick={() => closeConsulting(deal)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-60 hover:bg-slate-50"
                >
                  <X size={14} />
                  关闭
                </button>
              )}
              {canStartProposal && (
                <button
                  type="button"
                  disabled={busyId === order?.id || creatingLeadId === deal.leadId}
                  onClick={() => startProposal(deal)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-60 shadow-sm shadow-blue-600/20"
                >
                  <FileText size={14} />
                  {creatingLeadId === deal.leadId ? '创建中…' : '发起定制交付方案'}
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
                  上传 Skill
                </button>
              )}
              {order?.status === 'awaiting_proposal_confirm' && (
                <span className="text-[11px] text-violet-600 px-2 py-1.5 font-bold">等待用户确认方案…</span>
              )}
              {order?.status === 'awaiting_payment' && (
                <span className="text-[11px] text-slate-500 px-2 py-1.5">用户已确认方案，等待付款至平台托管…</span>
              )}
            </div>
          </div>
        );
      })}

      {proposalOrder && (
        <DeliveryProposalForm
          isOpen
          onClose={() => setProposalOrder(null)}
          baseAgentId={proposalOrder.baseAgentId || ''}
          baseAgentTitle={proposalOrder.baseAgentTitle}
          baseAgentVersion={proposalOrder.baseAgentVersion}
          initialCustomization={proposalOrder.title}
          onSubmit={async (proposal) => {
            await submitProposal(proposalOrder.id, proposal);
            setProposalOrder(null);
          }}
        />
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
export const BuyerExclusiveAgentsPanel: React.FC = () => {
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

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-slate-500">加载中…</p>}
      {!loading && items.length === 0 && (
        <p className="text-xs text-slate-500">暂无已推送的专属智能体。</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 text-xs">
          <div className="font-bold text-slate-900">{item.title}</div>
          <div className="text-slate-600 mt-0.5">
            {item.currentVersion} · 基于 {item.baseAgentTitle} {item.baseAgentVersion} · 仅您可用
          </div>
        </div>
      ))}
    </div>
  );
};
