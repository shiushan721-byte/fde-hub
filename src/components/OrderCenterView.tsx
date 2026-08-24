import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  RotateCcw,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import {
  buyerStatusText,
  CUSTOM_SERVICE_FILTERS,
  CustomServiceFilterKey,
  formatOrderTime,
  matchesCustomServiceFilter,
  statusBadgeClass,
  yuan
} from '../lib/customOrderLabels';
import { DeliveryProposalReviewPanel } from './DeliveryProposalReviewPanel';
import { DeliveryProposal } from '../types/deliveryProposal';
import { CustomServiceDeal } from '../types/customService';

/** 买家视角：我的定制（咨询 → 方案 → 支付 → 交付 → 验收） */
export const OrderCenterView: React.FC = () => {
  const [deals, setDeals] = useState<CustomServiceDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState<CustomServiceFilterKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailDeal, setDetailDeal] = useState<CustomServiceDeal | null>(null);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      await ensureMarketplaceSession();
      try {
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'user@hellome.art',
            password: 'hellome-user'
          })
        });
      } catch {
        /* keep current session */
      }
      const mine = await api<CustomServiceDeal[]>('/api/custom-services/mine');
      setDeals(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!detailDeal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailDeal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailDeal]);

  const filtered = useMemo(
    () => deals.filter((d) => matchesCustomServiceFilter(d.stageKey, filter)),
    [deals, filter]
  );

  const payAndEscrow = async (id: string) => {
    setBusyId(id);
    try {
      await api(`/api/custom-orders/${id}/pay`, { method: 'POST', body: '{}' });
      await api(`/api/custom-orders/${id}/confirm-escrow`, { method: 'POST', body: '{}' });
      alert('已付款至平台托管。创作者将开始开发并提交交付审核。');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '付款失败');
    } finally {
      setBusyId('');
    }
  };

  const confirmProposal = async (orderId: string) => {
    await api(`/api/custom-orders/${orderId}/confirm-proposal`, {
      method: 'POST',
      body: JSON.stringify({ ackEscrowRules: true })
    });
    alert('方案已确认，请尽快完成付款。资金将进入平台托管。');
    await reload();
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

  const accept = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await api(`/api/custom-orders/${orderId}/buyer-accept`, {
        method: 'POST',
        body: JSON.stringify({ feedback: '验收通过' })
      });
      alert('验收通过，订单进入待结算。');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '验收失败');
    } finally {
      setBusyId('');
    }
  };

  const revise = async (orderId: string) => {
    const feedback = window.prompt('请说明需要修改的内容（需对应需求清单中的具体项）');
    if (!feedback) return;
    setBusyId(orderId);
    try {
      await api(`/api/custom-orders/${orderId}/request-revision`, {
        method: 'POST',
        body: JSON.stringify({ feedback })
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '申请失败');
    } finally {
      setBusyId('');
    }
  };

  const openDispute = async (orderId: string) => {
    const reason = window.prompt('请说明争议原因（是否符合订单范围）');
    if (!reason?.trim()) return;
    const evidenceNote = window.prompt('补充证据说明（可选）') || undefined;
    setBusyId(orderId);
    try {
      await api(`/api/custom-orders/${orderId}/open-dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim(), evidenceNote })
      });
      alert('已发起争议，资金继续冻结，平台将介入判定。');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '发起争议失败');
    } finally {
      setBusyId('');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div id="order-center-view" className="space-y-6 pb-16">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-display flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600" />
            我的定制
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            咨询 → 确认方案 → 支付 → 开发 → 审核 → 验收，同一条流程跟进
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {CUSTOM_SERVICE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === f.key
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            加载定制服务…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-6">
            <p className="text-sm font-bold text-slate-800">暂无定制服务</p>
            <p className="text-xs text-slate-500">向专家发起咨询后，会出现在这里</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-bold w-8" />
                  <th className="px-4 py-3 font-bold">时间</th>
                  <th className="px-4 py-3 font-bold">编号</th>
                  <th className="px-4 py-3 font-bold">基础智能体</th>
                  <th className="px-4 py-3 font-bold">定制需求</th>
                  <th className="px-4 py-3 font-bold">阶段</th>
                  <th className="px-4 py-3 font-bold">状态</th>
                  <th className="px-4 py-3 font-bold text-right">金额</th>
                  <th className="px-4 py-3 font-bold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((deal) => {
                  const o = deal.order;
                  const expanded = expandedId === deal.dealId;
                  const status = o?.status || '';
                  const hasProposal =
                    status === 'awaiting_proposal_confirm' &&
                    o?.deliveryProposal &&
                    (o.deliveryProposal as DeliveryProposal).customizationItems?.length;
                  return (
                    <React.Fragment key={deal.dealId}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-2 py-3.5">
                          {(hasProposal || status === 'awaiting_proposal_confirm') && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(deal.dealId)}
                              className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer text-slate-500"
                            >
                              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          {formatOrderTime(o?.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {o?.orderNo || '咨询未成单'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{deal.agentTitle || o?.baseAgentTitle || '—'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {o?.baseAgentVersion
                              ? `锁定 ${o.baseAgentVersion}`
                              : deal.standardVersionAtRequest
                                ? `咨询时 ${deal.standardVersionAtRequest}`
                                : '未锁定版本'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <button
                            type="button"
                            onClick={() => setDetailDeal(deal)}
                            className="text-left w-full cursor-pointer group"
                          >
                            <div className="font-medium text-slate-800 truncate group-hover:text-blue-700">
                              {deal.requirement || o?.title || '—'}
                            </div>
                            {o?.creator?.name && (
                              <div className="text-[11px] text-slate-500 mt-0.5">专家 · {o.creator.name}</div>
                            )}
                            <span className="text-[10px] text-blue-600 font-bold mt-0.5 inline-block">
                              查看详情
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-slate-700 font-semibold">{deal.stageLabel}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${statusBadgeClass(
                              status || 'consulting'
                            )}`}
                          >
                            {status ? buyerStatusText[status] || status : '咨询沟通中'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-bold text-slate-900 tabular-nums">{yuan(o?.priceCents)}</span>
                          {(o?.priceCents || 0) > 0 && o?.deliveryDays ? (
                            <div className="text-[10px] text-slate-500 mt-0.5">{o.deliveryDays} 天交付</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {!o && <span className="text-[11px] text-slate-400">等待专家回复</span>}
                          {o && ['consulting', 'pending_quote'].includes(status) && (
                            <span className="text-[11px] text-slate-400">等待交付方案</span>
                          )}
                          {status === 'awaiting_proposal_confirm' && !expanded && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(deal.dealId)}
                              className="text-[11px] text-violet-600 font-bold cursor-pointer"
                            >
                              查看方案
                            </button>
                          )}
                          {status === 'pending_acceptance' && o && (
                            <div className="inline-flex flex-col items-end gap-1">
                              <div className="inline-flex gap-1.5">
                                <button
                                  type="button"
                                  disabled={busyId === o.id}
                                  onClick={() => accept(o.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-60"
                                >
                                  <CheckCircle2 size={11} />
                                  确认验收
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === o.id}
                                  onClick={() => revise(o.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold cursor-pointer disabled:opacity-60"
                                >
                                  <RotateCcw size={11} />
                                  申请修改
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === o.id}
                                  onClick={() => openDispute(o.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-rose-200 text-rose-700 font-bold cursor-pointer disabled:opacity-60"
                                >
                                  发起争议
                                </button>
                              </div>
                              {o.acceptanceDeadlineAt && (
                                <span className="text-[10px] text-slate-400">
                                  验收截止 {formatOrderTime(o.acceptanceDeadlineAt)}
                                </span>
                              )}
                            </div>
                          )}
                          {status === 'dispute' && (
                            <span className="text-[11px] text-rose-600 font-bold" title={o?.disputeReason}>
                              争议处理中
                            </span>
                          )}
                          {status === 'awaiting_payment' && o && (
                            <div className="inline-flex flex-col items-end gap-1">
                              <button
                                type="button"
                                disabled={busyId === o.id}
                                onClick={() => payAndEscrow(o.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-60"
                              >
                                {busyId === o.id ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <CreditCard size={11} />
                                )}
                                付款托管
                              </button>
                              {o.paymentDeadlineAt && (
                                <span className="text-[10px] text-amber-600">
                                  截止 {formatOrderTime(o.paymentDeadlineAt)}
                                </span>
                              )}
                            </div>
                          )}
                          {status === 'pending_settlement' && o && (
                            <span className="text-[11px] text-indigo-600 font-bold">
                              待结算
                              {o.settlementEligibleAt
                                ? ` · ${formatOrderTime(o.settlementEligibleAt)} 后`
                                : ''}
                            </span>
                          )}
                          {status === 'closed' && (
                            <span className="text-[11px] text-slate-400">已关闭</span>
                          )}
                          {o &&
                            ![
                              'consulting',
                              'pending_quote',
                              'awaiting_proposal_confirm',
                              'awaiting_payment',
                              'pending_acceptance',
                              'pending_settlement',
                              'dispute',
                              'closed'
                            ].includes(status) && (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                        </td>
                      </tr>
                      {expanded && hasProposal && o && (
                        <tr>
                          <td colSpan={9} className="px-4 py-4 bg-slate-50/50">
                            <DeliveryProposalReviewPanel
                              proposal={o.deliveryProposal as DeliveryProposal}
                              proposalVersion={o.proposalVersion}
                              proposalSubmittedAt={o.proposalSubmittedAt}
                              onConfirm={async () => {
                                setBusyId(o.id);
                                try {
                                  await confirmProposal(o.id);
                                } finally {
                                  setBusyId('');
                                  setExpandedId(null);
                                }
                              }}
                              onReject={async (reason) => {
                                setBusyId(o.id);
                                try {
                                  await rejectProposal(o.id, reason);
                                } finally {
                                  setBusyId('');
                                  setExpandedId(null);
                                }
                              }}
                              onRequestRevision={async (feedback) => {
                                setBusyId(o.id);
                                try {
                                  await requestProposalRevision(o.id, feedback);
                                } finally {
                                  setBusyId('');
                                  setExpandedId(null);
                                }
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-[11px] text-slate-400 text-right">
          共 {filtered.length} 条
          {filter !== 'all' ? `（筛选：${CUSTOM_SERVICE_FILTERS.find((f) => f.key === filter)?.label}）` : ''}
        </p>
      )}

      {detailDeal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setDetailDeal(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="custom-requirement-title"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 id="custom-requirement-title" className="text-sm font-bold text-slate-900">
                定制需求详情
              </h3>
              <button
                type="button"
                onClick={() => setDetailDeal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <div className="text-slate-400">编号</div>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {detailDeal.order?.orderNo || '咨询未成单'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">阶段</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{detailDeal.stageLabel}</div>
                </div>
                <div>
                  <div className="text-slate-400">基础智能体</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailDeal.agentTitle || detailDeal.order?.baseAgentTitle || '—'}
                    {detailDeal.order?.baseAgentVersion
                      ? ` · ${detailDeal.order.baseAgentVersion}`
                      : detailDeal.standardVersionAtRequest
                        ? ` · ${detailDeal.standardVersionAtRequest}`
                        : ''}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">专家</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailDeal.order?.creator?.name || '—'}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1.5">需求描述</div>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {detailDeal.requirement || detailDeal.order?.title || '暂无需求描述'}
                </p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailDeal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
