import React, { useEffect, useState } from 'react';
import {
  Package,
  Send,
  Loader2,
  FileText,
  Play
} from 'lucide-react';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import { creatorStatusText, formatOrderTime, yuan } from '../lib/customOrderLabels';
import { DeliveryProposalForm } from './DeliveryProposalForm';
import { DeliveryProposal } from '../types/deliveryProposal';

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  title: string;
  baseAgentId: string;
  baseAgentTitle: string;
  baseAgentVersion: string;
  priceCents?: number;
  deliveryDays?: number;
  serviceScope?: string;
  quoteNote?: string;
  paymentStatus?: string;
  createdAt?: string;
  deliveryProposal?: DeliveryProposal;
  proposalVersion?: number;
  instance?: { id: string; title: string; currentVersion: string } | null;
  deliveries?: Array<{ id: string; version: string; status: string; rejectReason?: string }>;
  buyer?: { name?: string; email?: string };
};

/** 创作者：定制订单管理（方案 → 托管 → 开发 → 审核 → 验收） */
export const CreatorCustomOrdersPanel: React.FC = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [proposalOrder, setProposalOrder] = useState<OrderRow | null>(null);

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
      const data = await api<OrderRow[]>('/api/custom-orders/creator');
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

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

  const startDevelopment = async (id: string) => {
    setBusyId(id);
    try {
      await api(`/api/custom-orders/${id}/start-development`, { method: 'POST', body: '{}' });
      await reload();
      alert('已开工，订单专属开发实例已创建。');
    } catch (err) {
      alert(err instanceof Error ? err.message : '开工失败');
    } finally {
      setBusyId('');
    }
  };

  const submitDelivery = async (id: string) => {
    const version = window.prompt('交付版本号', 'v1.0.0');
    if (!version) return;
    const changelog = window.prompt(
      '更新说明 / 完成的定制项',
      '已上传 Skill 包并通过沙箱自测，提交交付审核。'
    );
    if (!changelog) return;
    setBusyId(id);
    try {
      const result = await api<{ hermes: { passed: boolean; report: { issues: string[] } } }>(
        `/api/custom-orders/${id}/submit-delivery`,
        {
          method: 'POST',
          body: JSON.stringify({
            version,
            changelog,
            completedItems: changelog.split(/[；;,\n]/).map((s) => s.trim()).filter(Boolean),
            skillPayload: { skillFileName: 'customer_fork.zip', promptOverrides: true }
          })
        }
      );
      if (!result.hermes.passed) {
        alert(`Hermes 校验未通过：${result.hermes.report.issues.join('；')}`);
      } else {
        alert('已提交平台审核。通过后才会推送给客户。');
      }
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败');
    } finally {
      setBusyId('');
    }
  };

  const canPropose = (status: string) =>
    ['consulting', 'pending_quote', 'revision'].includes(status);

  const canStartDev = (status: string) =>
    ['paid_pending_start', 'escrowed'].includes(status);

  const canSubmitDelivery = (status: string) =>
    ['paid_pending_start', 'escrowed', 'revision', 'in_development'].includes(status);

  if (loading) return <p className="text-sm text-slate-500">加载定制订单…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Package size={15} className="text-blue-600" />
            定制订单管理
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            发起交付方案 → 用户确认并付款托管 → 开工开发 → 提交平台审核 → 验收结算
          </p>
        </div>
        <button type="button" onClick={reload} className="text-[11px] text-blue-600 font-bold cursor-pointer">
          刷新
        </button>
      </div>
      {orders.length === 0 && (
        <p className="text-xs text-slate-500">暂无订单。用户提交咨询后会出现在这里。</p>
      )}
      {orders.map((order) => {
        const hasPrice = (order.priceCents || 0) > 0;
        const proposal = order.deliveryProposal as DeliveryProposal | undefined;
        return (
          <div key={order.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900">{order.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {order.orderNo} · 基于 {order.baseAgentTitle} {order.baseAgentVersion}
                  {order.buyer?.name ? ` · ${order.buyer.name}` : ''}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  下单时间 · {formatOrderTime(order.createdAt)}
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1.5">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {creatorStatusText[order.status] || order.status}
                </span>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wide">订单价格</div>
                  <div
                    className={`text-lg font-black tabular-nums leading-tight ${
                      hasPrice ? 'text-amber-600' : 'text-slate-300'
                    }`}
                  >
                    {hasPrice ? yuan(order.priceCents) : '待填写'}
                  </div>
                </div>
              </div>
            </div>
            {hasPrice && (
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
                方案 v{order.proposalVersion ?? proposal.version} · 需求 {proposal.customizationItems.length} 项
              </p>
            ) : null}
            {order.instance && (
              <p className="text-[11px] text-slate-600">
                专属实例：{order.instance.title}
                {order.instance.currentVersion ? ` · ${order.instance.currentVersion}` : ''}
              </p>
            )}
            {order.deliveries?.[0]?.rejectReason && (
              <p className="text-[11px] text-rose-600">驳回：{order.deliveries[0].rejectReason}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {canPropose(order.status) && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => setProposalOrder(order)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-60 shadow-sm shadow-blue-600/20"
                >
                  <FileText size={14} />
                  发起定制交付方案
                </button>
              )}
              {order.status === 'awaiting_proposal_confirm' && (
                <span className="text-[11px] text-violet-600 px-2 py-1.5 font-bold">等待用户确认方案…</span>
              )}
              {order.status === 'awaiting_payment' && (
                <span className="text-[11px] text-slate-500 px-2 py-1.5">用户已确认方案，等待付款至平台托管…</span>
              )}
              {canStartDev(order.status) && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => startDevelopment(order.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 disabled:opacity-60"
                >
                  {busyId === order.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  开始开发
                </button>
              )}
              {canSubmitDelivery(order.status) && order.status !== 'paid_pending_start' && order.status !== 'escrowed' && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => submitDelivery(order.id)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 disabled:opacity-60"
                >
                  <Send size={12} />
                  提交交付审核
                </button>
              )}
            </div>
          </div>
        );
      })}

      {proposalOrder && (
        <DeliveryProposalForm
          isOpen
          onClose={() => setProposalOrder(null)}
          baseAgentId={proposalOrder.baseAgentId}
          baseAgentTitle={proposalOrder.baseAgentTitle}
          baseAgentVersion={proposalOrder.baseAgentVersion}
          initialCustomization={proposalOrder.title}
          onSubmit={async (proposal) => {
            await submitProposal(proposalOrder.id, proposal);
            setProposalOrder(null);
          }}
        />
      )}
    </div>
  );
};

/** 用户侧：已推送的专属智能体（订单进度见「订单中心」） */
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
