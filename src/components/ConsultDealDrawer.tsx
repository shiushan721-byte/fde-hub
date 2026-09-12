import React, { useEffect, useState } from 'react';
import { Handshake, X, FileText, Loader2, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import { formatOrderTime } from '../lib/customOrderLabels';
import { CustomServiceDeal, CustomServiceOrder } from '../types/customService';
import { CustomerLeadItem } from '../types/creator';
import { DeliveryProposal } from '../types/deliveryProposal';
import { DeliveryProposalForm } from './DeliveryProposalForm';
import {
  DeliveryProposalReviewPanel,
  hasViewableProposal
} from './DeliveryProposalReviewPanel';

type OrderRow = CustomServiceOrder;

function dealFromSessionLead(lead: CustomerLeadItem): CustomServiceDeal {
  return {
    dealId: lead.id,
    leadId: lead.id,
    orderId: null,
    stageKey: lead.status === 'closed' ? 'closed' : 'consulting',
    stageLabel: lead.status === 'closed' ? '已关闭' : '咨询中',
    clientName: lead.clientName,
    clientCompany: lead.clientCompany,
    clientAvatar: lead.clientAvatar,
    agentId: lead.agentId,
    agentTitle: lead.agentTitle,
    standardVersionAtRequest: lead.standardVersionAtRequest,
    requirement: lead.notes || lead.customizationSummary || '',
    leadStatus: lead.status,
    consultedAt: lead.consultedAt,
    order: null,
    audience: 'buyer',
    contacted: lead.status !== 'new',
    messages: []
  };
}

function selectedProjectsFromOrder(order?: OrderRow | null) {
  const spec = order?.customizationSpec;
  if (!spec || typeof spec !== 'object') return [];
  const rows = (spec as { selectedProjects?: Array<{ title?: string; price?: number }> }).selectedProjects;
  return Array.isArray(rows) ? rows.filter((row) => row?.title) : [];
}

function canPropose(status?: string) {
  return !status || ['consulting', 'pending_quote'].includes(status);
}

interface ConsultDealDrawerProps {
  dealId: string;
  sessionLeads?: CustomerLeadItem[];
  onClose: () => void;
  onBecameOrder?: (orderId: string) => void;
}

export const ConsultDealDrawer: React.FC<ConsultDealDrawerProps> = ({
  dealId,
  sessionLeads = [],
  onClose,
  onBecameOrder
}) => {
  const [deal, setDeal] = useState<CustomServiceDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [proposalOrder, setProposalOrder] = useState<OrderRow | null>(null);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      await ensureMarketplaceSession();
      const data = await api<CustomServiceDeal>(`/api/custom-services/${encodeURIComponent(dealId)}`);
      setDeal(data);
    } catch (err) {
      const session = sessionLeads.find((lead) => lead.id === dealId);
      if (session) {
        setDeal(dealFromSessionLead(session));
      } else {
        setError(err instanceof Error ? err.message : '加载咨询失败');
        setDeal(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [dealId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const order = deal?.order || null;
  const isCreator = deal?.audience === 'creator';
  const isClosed = deal?.leadStatus === 'closed' || order?.closeReason?.includes('closed_consulting');
  const orderStatus = order?.status || '';
  const awaitingProposal = orderStatus === 'awaiting_proposal_confirm';
  const awaitingPayment = orderStatus === 'awaiting_payment';
  const stillConsulting = !isClosed && canPropose(orderStatus);
  const proposal = order?.deliveryProposal as DeliveryProposal | undefined;
  const showProposal = hasViewableProposal(proposal);

  const markContacted = async () => {
    setBusy('contact');
    try {
      const data = await api<CustomServiceDeal>(`/api/custom-services/${encodeURIComponent(dealId)}/contact`, {
        method: 'POST',
        body: '{}'
      });
      setDeal(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy('');
    }
  };

  const closeConsult = async () => {
    if (!window.confirm('确认关闭该咨询？关闭后不会进入定制订单。')) return;
    setBusy('close');
    try {
      await api(`/api/custom-services/${encodeURIComponent(dealId)}/close`, {
        method: 'POST',
        body: '{}'
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '关闭失败');
    } finally {
      setBusy('');
    }
  };

  const createOrderFromLead = async (): Promise<OrderRow | null> => {
    if (!deal?.leadId) return null;
    if (!deal.agentId) {
      alert('该咨询未关联智能体，无法发起交付方案。');
      return null;
    }
    setBusy('propose');
    try {
      return await api<OrderRow>(`/api/custom-orders/from-lead/${deal.leadId}`, {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建交付订单失败');
      return null;
    } finally {
      setBusy('');
    }
  };

  const startProposal = async () => {
    if (order && canPropose(order.status)) {
      setProposalOrder(order);
      return;
    }
    const created = await createOrderFromLead();
    if (created) setProposalOrder(created);
  };

  const submitProposal = async (
    orderId: string,
    payload: Omit<DeliveryProposal, 'submittedAt' | 'version'>
  ) => {
    setBusy('propose');
    try {
      await api(`/api/custom-orders/${orderId}/proposal`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await reload();
      alert('已发起定制交付方案，等待用户确认。');
    } finally {
      setBusy('');
    }
  };

  const confirmProposal = async (orderId: string) => {
    await api(`/api/custom-orders/${orderId}/confirm-proposal`, {
      method: 'POST',
      body: JSON.stringify({ ackEscrowRules: true })
    });
    alert('方案已确认，请尽快完成付款。资金将进入平台托管。');
    onBecameOrder?.(orderId);
  };

  const rejectProposal = async (orderId: string, reason: string) => {
    await api(`/api/custom-orders/${orderId}/reject-proposal`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    await reload();
  };

  const requestProposalRevision = async (orderId: string, feedback: string) => {
    await api(`/api/custom-orders/${orderId}/request-proposal-revision`, {
      method: 'POST',
      body: JSON.stringify({ feedback })
    });
    alert('已通知创作者修改方案，请等待新版本。');
    await reload();
  };

  const nextHint = (() => {
    if (!deal || isClosed) return '';
    if (awaitingPayment) return '方案已确认，下一步请完成付款。付款后订单进入「我的定制」。';
    if (awaitingProposal) {
      return isCreator ? '已发起方案，等待用户确认后才会进入定制订单。' : '请确认交付方案。确认后进入「我的定制」付款。';
    }
    if (isCreator) return '查看需求后，去联系或直接发起定制交付方案；关闭则不成单。';
    return '创作者跟进后会发起交付方案。若不再需要，可以关闭咨询。';
  })();

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="relative w-full max-w-[520px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wide">咨询待办</div>
            <h2 className="text-base font-black text-slate-900 mt-0.5">
              {deal?.agentTitle || '定制咨询'}
            </h2>
            {deal && (
              <p className="text-[11px] text-slate-500 mt-1">
                {isCreator
                  ? [deal.clientName, deal.clientCompany].filter(Boolean).join(' · ')
                  : deal.expertName
                    ? `专家 · ${deal.expertName}`
                    : '等待创作者跟进'}
                {deal.consultedAt ? ` · ${formatOrderTime(deal.consultedAt)}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              加载咨询…
            </p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {deal && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] font-bold text-slate-400">需求</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {deal.stageLabel}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {deal.requirement || order?.title || '暂无需求描述'}
                </p>
              </div>

              {nextHint && (
                <p className="text-xs text-slate-500 bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-2">
                  下一步：{nextHint}
                </p>
              )}

              {showProposal && order && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
                  <DeliveryProposalReviewPanel
                    proposal={proposal as DeliveryProposal}
                    proposalVersion={order.proposalVersion}
                    proposalSubmittedAt={order.proposalSubmittedAt}
                    readOnly={!awaitingProposal || isCreator}
                    statusHint={awaitingProposal ? '待确认' : deal.stageLabel}
                    onConfirm={
                      awaitingProposal && !isCreator
                        ? async () => {
                            setBusy('propose');
                            try {
                              await confirmProposal(order.id);
                            } finally {
                              setBusy('');
                            }
                          }
                        : undefined
                    }
                    onReject={
                      awaitingProposal && !isCreator
                        ? async (reason) => {
                            setBusy('propose');
                            try {
                              await rejectProposal(order.id, reason);
                            } finally {
                              setBusy('');
                            }
                          }
                        : undefined
                    }
                    onRequestRevision={
                      awaitingProposal && !isCreator
                        ? async (feedback) => {
                            setBusy('propose');
                            try {
                              await requestProposalRevision(order.id, feedback);
                            } finally {
                              setBusy('');
                            }
                          }
                        : undefined
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>

        {deal && !isClosed && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0">
            <div className="flex flex-wrap gap-2">
              {stillConsulting && !deal.contacted && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void markContacted()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Handshake size={14} />
                  {busy === 'contact' ? '处理中…' : '去联系'}
                </button>
              )}
              {stillConsulting && isCreator && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void startProposal()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <FileText size={14} />
                  {busy === 'propose' ? '处理中…' : '发起定制交付方案'}
                </button>
              )}
              {awaitingPayment && order && (
                <button
                  type="button"
                  onClick={() => onBecameOrder?.(order.id)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard size={14} />
                  去支付
                </button>
              )}
              {stillConsulting && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void closeConsult()}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  关闭咨询
                </button>
              )}
            </div>
          </div>
        )}

        {deal && isClosed && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
            该咨询已关闭，不会进入定制订单。
          </div>
        )}
      </div>

      {proposalOrder && (
        <DeliveryProposalForm
          isOpen
          onClose={() => setProposalOrder(null)}
          baseAgentId={proposalOrder.baseAgentId || ''}
          baseAgentTitle={proposalOrder.baseAgentTitle}
          baseAgentVersion={proposalOrder.baseAgentVersion}
          initialCustomization={
            selectedProjectsFromOrder(proposalOrder)
              .map((item) => item.title)
              .join('\n') || proposalOrder.title
          }
          initialPriceYuan={
            proposalOrder.priceCents && proposalOrder.priceCents > 0
              ? String((proposalOrder.priceCents / 100).toFixed(0))
              : ''
          }
          onSubmit={async (proposalPayload) => {
            await submitProposal(proposalOrder.id, proposalPayload);
            setProposalOrder(null);
          }}
        />
      )}
    </div>
  );
};
