import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CreditCard, Landmark, Loader2, RefreshCw, Receipt, ShoppingBag, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import {
  buyerStatusText,
  formatOrderTime,
  isBuyerPaid,
  paymentBadgeClass,
  paymentStatusText,
  yuanAmount
} from '../lib/customOrderLabels';
import { CustomServiceDeal } from '../types/customService';

type BillingKind = 'catalog' | 'custom';
type CustomFilter = 'all' | 'paid' | 'escrow' | 'pending' | 'settled';
type CatalogFilter = 'all' | 'paid' | 'pending' | 'expired';

type CatalogPurchaseRow = {
  id: string;
  agentId: string;
  agentTitle?: string;
  authorName?: string;
  plan: string;
  priceCents: number;
  status: string;
  channel: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  active: boolean;
};

function channelText(channel?: string) {
  if (channel === 'wechat') return '微信支付';
  if (channel === 'alipay') return '支付宝';
  return '—';
}

function planText(plan?: string) {
  if (plan === 'monthly') return '月付';
  if (plan === 'annual') return '年付';
  if (plan === 'buyout') return '买断';
  return plan || '—';
}

function catalogStatus(row: CatalogPurchaseRow) {
  if (row.status !== 'paid') return 'pending';
  return row.active ? 'active' : 'expired';
}

function catalogStatusText(status: string) {
  if (status === 'active') return '已开通';
  if (status === 'expired') return '已到期';
  return '待支付';
}

function catalogBadgeClass(status: string) {
  if (status === 'active') return paymentBadgeClass('settled');
  if (status === 'expired') return paymentBadgeClass('expired');
  return paymentBadgeClass('pending');
}

/** 买家订单中心：智能体购买 与 定制订单 分表 */
export const BuyerOrderBillingView: React.FC = () => {
  const [kind, setKind] = useState<BillingKind>('catalog');
  const [deals, setDeals] = useState<CustomServiceDeal[]>([]);
  const [purchases, setPurchases] = useState<CatalogPurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customFilter, setCustomFilter] = useState<CustomFilter>('all');
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all');

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
      const [mine, catalog] = await Promise.all([
        api<CustomServiceDeal[]>('/api/custom-services/mine'),
        api<CatalogPurchaseRow[]>('/api/me/purchases').catch(() => [] as CatalogPurchaseRow[])
      ]);
      setDeals(mine);
      setPurchases(catalog);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setDeals([]);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const billable = useMemo(() => {
    return deals.filter((d) => {
      const o = d.order;
      if (!o || !(o.priceCents && o.priceCents > 0)) return false;
      return (
        isBuyerPaid(o.paymentStatus) ||
        o.paymentStatus === 'pending' ||
        o.status === 'awaiting_payment' ||
        o.paymentStatus === 'refunded'
      );
    });
  }, [deals]);

  const spendSummary = useMemo(() => {
    let paidCents = 0;
    let escrowCents = 0;
    let pendingPayCents = 0;
    let paidOrderCount = 0;
    const byAgent = new Map<string, { title: string; paidCents: number; orderCount: number }>();

    for (const deal of billable) {
      const o = deal.order!;
      const price = o.priceCents || 0;
      const agentTitle = deal.agentTitle || o.baseAgentTitle || '未命名智能体';
      if (isBuyerPaid(o.paymentStatus)) {
        paidCents += price;
        paidOrderCount += 1;
        if (o.paymentStatus === 'escrowed') escrowCents += price;
        const row = byAgent.get(agentTitle) || { title: agentTitle, paidCents: 0, orderCount: 0 };
        row.paidCents += price;
        row.orderCount += 1;
        byAgent.set(agentTitle, row);
      } else if (o.paymentStatus === 'pending' || o.status === 'awaiting_payment') {
        pendingPayCents += price;
      }
    }

    return {
      paidCents,
      escrowCents,
      pendingPayCents,
      paidOrderCount,
      byAgent: [...byAgent.values()].sort((a, b) => b.paidCents - a.paidCents)
    };
  }, [billable]);

  const catalogSummary = useMemo(() => {
    let paidCents = 0;
    let pendingCents = 0;
    let activeCount = 0;
    let paidCount = 0;
    const byAgent = new Map<string, { title: string; paidCents: number; orderCount: number }>();

    for (const row of purchases) {
      if (row.status === 'paid') {
        paidCents += row.priceCents || 0;
        paidCount += 1;
        if (row.active) activeCount += 1;
        const title = row.agentTitle || '未命名智能体';
        const item = byAgent.get(title) || { title, paidCents: 0, orderCount: 0 };
        item.paidCents += row.priceCents || 0;
        item.orderCount += 1;
        byAgent.set(title, item);
      } else {
        pendingCents += row.priceCents || 0;
      }
    }

    return {
      paidCents,
      pendingCents,
      activeCount,
      paidCount,
      byAgent: [...byAgent.values()].sort((a, b) => b.paidCents - a.paidCents)
    };
  }, [purchases]);

  const filteredCustom = useMemo(() => {
    return billable.filter((deal) => {
      const o = deal.order!;
      if (customFilter === 'all') return true;
      if (customFilter === 'paid') return isBuyerPaid(o.paymentStatus);
      if (customFilter === 'escrow') return o.paymentStatus === 'escrowed';
      if (customFilter === 'pending') {
        return o.paymentStatus === 'pending' || o.status === 'awaiting_payment';
      }
      if (customFilter === 'settled') {
        return o.paymentStatus === 'settled' || o.paymentStatus === 'released';
      }
      return true;
    });
  }, [billable, customFilter]);

  const filteredCatalog = useMemo(() => {
    return purchases.filter((row) => {
      const status = catalogStatus(row);
      if (catalogFilter === 'all') return true;
      if (catalogFilter === 'paid') return row.status === 'paid';
      if (catalogFilter === 'pending') return status === 'pending';
      if (catalogFilter === 'expired') return status === 'expired';
      return true;
    });
  }, [purchases, catalogFilter]);

  const customFilters: { key: CustomFilter; label: string }[] = [
    { key: 'all', label: '全部账单' },
    { key: 'paid', label: '已付款' },
    { key: 'escrow', label: '托管中' },
    { key: 'pending', label: '待支付' },
    { key: 'settled', label: '已结算' }
  ];

  const catalogFilters: { key: CatalogFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'paid', label: '已开通' },
    { key: 'pending', label: '待支付' },
    { key: 'expired', label: '已到期' }
  ];

  return (
    <div id="buyer-order-billing-view" className="space-y-6 pb-16">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-display flex items-center gap-2">
            <Receipt size={22} className="text-emerald-600" />
            订单中心
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            智能体购买与定制订单分开记账；定制履约进度请去「我的定制」
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setKind('catalog')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            kind === 'catalog'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag size={13} />
          智能体购买
        </button>
        <button
          type="button"
          onClick={() => setKind('custom')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            kind === 'custom'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bot size={13} />
          定制订单
        </button>
      </div>

      {kind === 'catalog' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>累计已付</span>
              <Wallet size={14} className="text-amber-400" />
            </div>
            <div className="text-2xl font-black tabular-nums">{yuanAmount(catalogSummary.paidCents)}</div>
            <p className="text-[11px] text-slate-400">{catalogSummary.paidCount} 笔标准版购买</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>有效中</span>
              <ShoppingBag size={14} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">{catalogSummary.activeCount}</div>
            <p className="text-[11px] text-slate-500">当前仍可使用的套餐</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>待支付</span>
              <CreditCard size={14} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {yuanAmount(catalogSummary.pendingCents)}
            </div>
            <p className="text-[11px] text-slate-500">已下单未完成付款</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>按智能体消费</span>
              <Bot size={14} className="text-violet-500" />
            </div>
            {catalogSummary.byAgent.length === 0 ? (
              <p className="text-xs text-slate-400 pt-2">购买后按智能体归集显示</p>
            ) : (
              <div className="space-y-1.5 max-h-[72px] overflow-y-auto pr-1">
                {catalogSummary.byAgent.slice(0, 4).map((row) => (
                  <div key={row.title} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-700 font-medium">{row.title}</span>
                    <span className="shrink-0 font-bold tabular-nums text-slate-900">
                      {yuanAmount(row.paidCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>累计已付</span>
              <Wallet size={14} className="text-amber-400" />
            </div>
            <div className="text-2xl font-black tabular-nums">{yuanAmount(spendSummary.paidCents)}</div>
            <p className="text-[11px] text-slate-400">{spendSummary.paidOrderCount} 笔已付款定制</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>托管中</span>
              <Landmark size={14} className="text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {yuanAmount(spendSummary.escrowCents)}
            </div>
            <p className="text-[11px] text-slate-500">验收完成前由平台托管</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>待支付</span>
              <CreditCard size={14} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {yuanAmount(spendSummary.pendingPayCents)}
            </div>
            <p className="text-[11px] text-slate-500">方案已确认、等待付款</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>按智能体消费</span>
              <Bot size={14} className="text-violet-500" />
            </div>
            {spendSummary.byAgent.length === 0 ? (
              <p className="text-xs text-slate-400 pt-2">付款后按智能体归集显示</p>
            ) : (
              <div className="space-y-1.5 max-h-[72px] overflow-y-auto pr-1">
                {spendSummary.byAgent.slice(0, 4).map((row) => (
                  <div key={row.title} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-700 font-medium">{row.title}</span>
                    <span className="shrink-0 font-bold tabular-nums text-slate-900">
                      {yuanAmount(row.paidCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {kind === 'catalog'
          ? catalogFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setCatalogFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  catalogFilter === f.key
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))
          : customFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setCustomFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  customFilter === f.key
                    ? 'bg-slate-900 text-white shadow-2xs'
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
            加载账单…
          </div>
        ) : kind === 'catalog' ? (
          filteredCatalog.length === 0 ? (
            <div className="py-16 text-center space-y-2 px-6">
              <p className="text-sm font-bold text-slate-800">暂无智能体购买</p>
              <p className="text-xs text-slate-500">在智能体详情页选择套餐并完成支付后，会记在这里</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-bold">付款 / 下单时间</th>
                    <th className="px-4 py-3 font-bold">订单</th>
                    <th className="px-4 py-3 font-bold">智能体</th>
                    <th className="px-4 py-3 font-bold">套餐</th>
                    <th className="px-4 py-3 font-bold">状态</th>
                    <th className="px-4 py-3 font-bold">支付渠道</th>
                    <th className="px-4 py-3 font-bold">有效期</th>
                    <th className="px-4 py-3 font-bold text-right">金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCatalog.map((row) => {
                    const status = catalogStatus(row);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          {formatOrderTime(row.paidAt || row.createdAt)}
                          {row.paidAt && <div className="text-[10px] text-slate-400 mt-0.5">已付款</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-[11px] text-slate-800">{row.id}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{row.agentTitle || '—'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{row.authorName || '—'}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{planText(row.plan)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${catalogBadgeClass(
                              status
                            )}`}
                          >
                            {catalogStatusText(status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{channelText(row.channel)}</td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          {row.plan === 'buyout'
                            ? '长期有效'
                            : row.expiresAt
                              ? formatOrderTime(row.expiresAt)
                              : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-900">
                          {yuanAmount(row.priceCents || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filteredCustom.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-6">
            <p className="text-sm font-bold text-slate-800">暂无定制账单</p>
            <p className="text-xs text-slate-500">在「我的定制」确认方案并付款后，会按智能体记在这里</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-bold">付款 / 下单时间</th>
                  <th className="px-4 py-3 font-bold">订单</th>
                  <th className="px-4 py-3 font-bold">定制智能体</th>
                  <th className="px-4 py-3 font-bold">专家</th>
                  <th className="px-4 py-3 font-bold">资金状态</th>
                  <th className="px-4 py-3 font-bold">支付渠道</th>
                  <th className="px-4 py-3 font-bold text-right">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustom.map((deal) => {
                  const o = deal.order!;
                  const payStatus =
                    o.paymentStatus === 'none' && o.status === 'awaiting_payment'
                      ? 'pending'
                      : o.paymentStatus || 'none';
                  return (
                    <tr key={deal.dealId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {formatOrderTime(o.paidAt || o.createdAt || deal.consultedAt)}
                        {o.paidAt && <div className="text-[10px] text-slate-400 mt-0.5">已付款</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-[11px] text-slate-800">{o.orderNo}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {buyerStatusText[o.status] || o.status}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">
                          {deal.agentTitle || o.baseAgentTitle || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                          {deal.requirement || o.title || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{o.creator?.name || '—'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${paymentBadgeClass(
                            payStatus
                          )}`}
                        >
                          {paymentStatusText[payStatus] || payStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{channelText(o.paymentChannel)}</td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-900">
                        {yuanAmount(o.priceCents || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && kind === 'catalog' && filteredCatalog.length > 0 && (
        <p className="text-[11px] text-slate-400 text-right">共 {filteredCatalog.length} 笔购买</p>
      )}
      {!loading && kind === 'custom' && filteredCustom.length > 0 && (
        <p className="text-[11px] text-slate-400 text-right">共 {filteredCustom.length} 笔定制账单</p>
      )}
    </div>
  );
};
