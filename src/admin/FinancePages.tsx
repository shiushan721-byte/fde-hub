import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { creatorStatusText } from '../lib/customOrderLabels';

function useAdminQuery<T>(path: string, extraKey = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [path, extraKey]);

  return { data, error, loading, reload: load };
}

function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function channelText(channel?: string) {
  if (channel === 'wechat') return '微信支付';
  if (channel === 'alipay') return '支付宝';
  return channel || '—';
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN');
}

const withdrawStatusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '已通过待打款',
  rejected: '已驳回',
  paid: '已打款',
  succeeded: '已到账',
  cancelled: '已取消'
};

const paymentStatusLabel: Record<string, string> = {
  none: '未支付',
  pending: '待支付',
  escrowed: '托管中',
  released: '已释放',
  settled: '已结算',
  refunded: '已退款',
  expired: '已过期'
};

type Person = { id?: string; name?: string; email?: string } | null;

type ExpertAccountRow = {
  expertId: string;
  expertNo: string;
  expertName: string;
  userId: string;
  userName: string;
  email: string;
  pendingCents: number;
  availableCents: number;
  frozenCents: number;
  withdrawnTotalCents: number;
  inflightCount: number;
  inflightCents: number;
  wechatBound: boolean;
  wechatAccount: string;
  alipayBound: boolean;
  alipayAccount: string;
};

type SettlementRow = {
  id: string;
  orderNo: string;
  title: string;
  baseAgentTitle?: string;
  baseAgentVersion?: string;
  status: string;
  paymentStatus: string;
  paymentChannel?: string;
  priceCents: number;
  createdAt?: string;
  buyer?: { id?: string; name?: string; email?: string; phone?: string } | null;
  seller?: { id?: string; name?: string; email?: string; phone?: string } | null;
};

function settlementFundStatus(status: string, paymentStatus: string) {
  if (status === 'completed' || paymentStatus === 'settled') return '已完成';
  if (
    status === 'awaiting_payment' ||
    paymentStatus === 'pending' ||
    paymentStatus === 'expired'
  ) {
    return '待支付';
  }
  if (
    paymentStatus === 'escrowed' ||
    paymentStatus === 'released' ||
    [
      'paid_pending_start',
      'escrowed',
      'in_development',
      'in_review',
      'revision',
      'pending_acceptance',
      'pending_settlement',
      'dispute'
    ].includes(status)
  ) {
    return '平台托管中';
  }
  return '待支付';
}

type EscrowRow = {
  id: string;
  orderNo: string;
  title: string;
  status: string;
  paymentStatus: string;
  paymentChannel?: string;
  priceCents: number;
  paidAt?: string | null;
  escrowedAt?: string | null;
  buyer?: Person;
  creator?: Person;
};

type WithdrawalRow = {
  id: string;
  withdrawNo: string;
  amountCents: number;
  feeCents?: number;
  channel: string;
  account: string;
  status: string;
  reason?: string;
  paidNote?: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    expert?: { name?: string; expertNo?: string } | null;
  };
};

function PageHeader({
  title,
  desc,
  onReload
}: {
  title: string;
  desc: string;
  onReload: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-black">{title}</h1>
        <p className="text-xs text-slate-500 mt-1">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onReload}
        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
      >
        刷新
      </button>
    </div>
  );
}

function SideDrawer({
  title,
  subtitle,
  onClose,
  children,
  footer
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 shrink-0 space-y-2">{footer}</div>}
      </div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 font-medium text-right">{value || '—'}</span>
    </div>
  );
}

export const ExpertAccountsPage = () => {
  const { data, error, loading, reload } = useAdminQuery<ExpertAccountRow[]>('/api/admin/expert-accounts');
  const [detail, setDetail] = useState<ExpertAccountRow | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="专家账户余额"
        desc="接单专家的待提现、可提现、在途提现与已提现，以及收款账号绑定"
        onReload={reload}
      />
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">专家</th>
              <th className="text-right p-3">待提现</th>
              <th className="text-right p-3">可提现</th>
              <th className="text-right p-3">在途提现</th>
              <th className="text-right p-3">已提现</th>
              <th className="text-left p-3">收款绑定</th>
              <th className="text-left p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row, index) => (
              <tr key={row.expertId} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 tabular-nums">
                  {(data?.length || 0) - index}
                </td>
                <td className="p-3">
                  <div className="font-bold">{row.expertName}</div>
                  <div className="text-slate-400">
                    {row.expertNo || row.email}
                  </div>
                </td>
                <td className="p-3 text-right">{yuan(row.pendingCents)}</td>
                <td className="p-3 text-right font-bold">{yuan(row.availableCents)}</td>
                <td className="p-3 text-right text-amber-700">{yuan(row.frozenCents)}</td>
                <td className="p-3 text-right">{yuan(row.withdrawnTotalCents)}</td>
                <td className="p-3 text-slate-500">
                  {row.alipayBound ? '支付宝' : '未绑定'}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className="font-bold text-slate-700 cursor-pointer"
                    onClick={() => setDetail(row)}
                  >
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p className="p-6 text-sm text-slate-400 text-center">暂无专家账户</p>}
      </div>

      {detail && (
        <SideDrawer title="专家资金账户" subtitle={detail.expertName} onClose={() => setDetail(null)}>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['待提现', detail.pendingCents],
              ['可提现', detail.availableCents],
              ['在途提现', detail.frozenCents],
              ['已提现', detail.withdrawnTotalCents]
            ].map(([label, cents]) => (
              <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className="text-sm font-black mt-1">{yuan(Number(cents))}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-xl border border-slate-100 p-4">
            <div className="text-[11px] font-bold text-slate-500">收款账号</div>
            <Kv
              label="支付宝"
              value={detail.alipayBound ? detail.alipayAccount || '已绑定' : '未绑定'}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-100 p-4">
            <div className="text-[11px] font-bold text-slate-500">在途提现</div>
            <Kv label="笔数" value={String(detail.inflightCount)} />
            <Kv label="金额" value={yuan(detail.inflightCents)} />
          </div>
        </SideDrawer>
      )}
    </div>
  );
};

const SETTLEMENT_STATUS_OPTIONS = ['待支付', '平台托管中', '已完成'] as const;

export const SettlementsPage = () => {
  const { data, error, loading } = useAdminQuery<SettlementRow[]>('/api/admin/settlements');
  const [orderNo, setOrderNo] = useState('');
  const [phone, setPhone] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => {
    const list = data || [];
    const orderQ = orderNo.trim().toLowerCase();
    const phoneQ = phone.trim();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return list.filter((row) => {
      if (orderQ && !row.orderNo.toLowerCase().includes(orderQ)) return false;

      if (phoneQ) {
        const buyerPhone = row.buyer?.phone || '';
        const sellerPhone = row.seller?.phone || '';
        if (!buyerPhone.includes(phoneQ) && !sellerPhone.includes(phoneQ)) return false;
      }

      if (fromTs != null || toTs != null) {
        const created = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
        if (!Number.isFinite(created)) return false;
        if (fromTs != null && created < fromTs) return false;
        if (toTs != null && created > toTs) return false;
      }

      if (status) {
        const fundStatus = settlementFundStatus(row.status, row.paymentStatus);
        if (fundStatus !== status) return false;
      }

      return true;
    });
  }, [data, orderNo, phone, dateFrom, dateTo, status]);

  const inputClass =
    'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">订单结算</h1>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">订单号</span>
          <input
            type="text"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="订单编号"
            className={`${inputClass} w-44`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">手机号</span>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="买家 / 卖家"
            className={`${inputClass} w-36`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">开始时间</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">结束时间</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">状态</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="">全部</option>
            {SETTLEMENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">订单编号</th>
              <th className="text-left p-3">订单智能体</th>
              <th className="text-left p-3">买家</th>
              <th className="text-left p-3">卖家</th>
              <th className="text-right p-3">订单金额</th>
              <th className="text-left p-3">状态</th>
              <th className="text-left p-3">下单时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 tabular-nums">{rows.length - index}</td>
                <td className="p-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                  {row.orderNo}
                </td>
                <td className="p-3">
                  <div className="font-bold text-slate-900">
                    {row.baseAgentTitle || row.title || '—'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {row.baseAgentVersion ? `版本 ${row.baseAgentVersion}` : '—'}
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-bold text-slate-900">{row.buyer?.name || '—'}</div>
                  <div className="text-slate-500 mt-0.5 font-mono">
                    {row.buyer?.phone || '—'}
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-bold text-slate-900">{row.seller?.name || '—'}</div>
                  <div className="text-slate-500 mt-0.5 font-mono">
                    {row.seller?.phone || '—'}
                  </div>
                  <div className="text-slate-400 mt-0.5 font-mono text-[10px]">
                    {row.seller?.id || '—'}
                  </div>
                </td>
                <td className="p-3 text-right font-bold">{yuan(row.priceCents)}</td>
                <td className="p-3">{settlementFundStatus(row.status, row.paymentStatus)}</td>
                <td className="p-3 text-slate-500 whitespace-nowrap">{formatTime(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无匹配的结算订单</p>
        )}
      </div>
    </div>
  );
};

export const EscrowsPage = () => {
  const { data, error, loading, reload } = useAdminQuery<EscrowRow[]>('/api/admin/escrows');
  const total = (data || []).reduce((sum, row) => sum + row.priceCents, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="资金托管"
        desc="买家已付、平台托管中的定制订单。验收完成并过观察期后释放至专家待提现/可提现。"
        onReload={reload}
      />
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs">
        当前托管 <span className="font-black">{data?.length || 0}</span> 笔，合计{' '}
        <span className="font-black">{yuan(total)}</span>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3">托管时间</th>
              <th className="text-left p-3">订单</th>
              <th className="text-left p-3">买家</th>
              <th className="text-left p-3">专家</th>
              <th className="text-left p-3">渠道</th>
              <th className="text-right p-3">托管金额</th>
              <th className="text-left p-3">资金状态</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 whitespace-nowrap">
                  {formatTime(row.escrowedAt || row.paidAt)}
                </td>
                <td className="p-3">
                  <div className="font-bold">{row.orderNo}</div>
                  <div className="text-slate-400">{row.title}</div>
                </td>
                <td className="p-3">
                  {row.buyer?.name || '—'}
                  {row.buyer?.email && <div className="text-slate-400">{row.buyer.email}</div>}
                </td>
                <td className="p-3">{row.creator?.name || '—'}</td>
                <td className="p-3">{channelText(row.paymentChannel)}</td>
                <td className="p-3 text-right font-bold">{yuan(row.priceCents)}</td>
                <td className="p-3">
                  {paymentStatusLabel[row.paymentStatus] || row.paymentStatus}
                  <div className="text-slate-400">{creatorStatusText[row.status] || row.status}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p className="p-6 text-sm text-slate-400 text-center">暂无托管中的资金</p>}
      </div>
    </div>
  );
};

export const WithdrawalsPage = () => {
  const { data, error, loading, reload } = useAdminQuery<WithdrawalRow[]>('/api/admin/withdrawals');
  const [tab, setTab] = useState<'review' | 'records'>('review');
  const [detail, setDetail] = useState<WithdrawalRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [paidNote, setPaidNote] = useState('');
  const [busy, setBusy] = useState('');

  const reviewRows = useMemo(
    () => (data || []).filter((w) => w.status === 'pending' || w.status === 'approved'),
    [data]
  );
  const rows = tab === 'review' ? reviewRows : data || [];

  const expertName = (w: WithdrawalRow) => w.user?.expert?.name || w.user?.name || '—';

  const runReview = async (approved: boolean) => {
    if (!detail) return;
    if (!approved && !rejectReason.trim()) {
      alert('驳回请填写原因');
      return;
    }
    setBusy(approved ? 'approve' : 'reject');
    try {
      await api(`/api/admin/withdrawals/${detail.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ approved, reason: rejectReason })
      });
      setDetail(null);
      setRejectReason('');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '审核失败');
    } finally {
      setBusy('');
    }
  };

  const runPaid = async () => {
    if (!detail) return;
    if (!paidNote.trim()) {
      alert('请填写线下打款流水号或备注');
      return;
    }
    setBusy('paid');
    try {
      await api(`/api/admin/withdrawals/${detail.id}/paid`, {
        method: 'POST',
        body: JSON.stringify({ paidNote })
      });
      setDetail(null);
      setPaidNote('');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '确认打款失败');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="提现管理"
        desc="专家提现先冻结可提现余额，审核通过后线下打款，再确认到账；驳回则退回可提现"
        onReload={reload}
      />
      <div className="flex rounded-xl border border-slate-200 p-0.5 w-fit bg-white">
        <button
          type="button"
          onClick={() => setTab('review')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
            tab === 'review' ? 'bg-slate-900 text-white' : 'text-slate-500'
          }`}
        >
          提现审核 ({reviewRows.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('records')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
            tab === 'records' ? 'bg-slate-900 text-white' : 'text-slate-500'
          }`}
        >
          提现记录 ({data?.length || 0})
        </button>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">时间</th>
              <th className="text-left p-3">提现单号</th>
              <th className="text-left p-3">专家</th>
              <th className="text-left p-3">渠道 / 账号</th>
              <th className="text-right p-3">金额</th>
              <th className="text-right p-3">手续费</th>
              <th className="text-left p-3">状态</th>
              <th className="text-left p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, index) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 tabular-nums">{rows.length - index}</td>
                <td className="p-3 text-slate-500 whitespace-nowrap">{formatTime(w.createdAt)}</td>
                <td className="p-3 font-mono text-[11px]">{w.withdrawNo}</td>
                <td className="p-3">
                  {expertName(w)}
                  <div className="text-slate-400 font-mono">{w.user?.phone || '—'}</div>
                </td>
                <td className="p-3">
                  {channelText(w.channel)}
                  <div className="text-slate-400">{w.account}</div>
                </td>
                <td className="p-3 text-right font-bold">{yuan(w.amountCents)}</td>
                <td className="p-3 text-right text-slate-500">{yuan(w.feeCents || 0)}</td>
                <td className="p-3">{withdrawStatusLabel[w.status] || w.status}</td>
                <td className="p-3">
                  <button
                    type="button"
                    className="font-bold text-slate-700 cursor-pointer"
                    onClick={() => {
                      setDetail(w);
                      setRejectReason('');
                      setPaidNote('');
                    }}
                  >
                    {w.status === 'pending' || w.status === 'approved' ? '处理' : '详情'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">
            {tab === 'review' ? '暂无待处理提现' : '暂无提现记录'}
          </p>
        )}
      </div>

      {detail && (
        <SideDrawer
          title="提现单"
          subtitle={detail.withdrawNo}
          onClose={() => setDetail(null)}
          footer={
            detail.status === 'pending' || detail.status === 'approved' ? (
              <div className="space-y-3">
                {detail.status === 'pending' && (
                  <>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="驳回原因（驳回时必填）"
                      className="w-full min-h-20 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void runReview(true)}
                        className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {busy === 'approve' ? '提交中…' : '审核通过'}
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void runReview(false)}
                        className="flex-1 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {busy === 'reject' ? '提交中…' : '驳回'}
                      </button>
                    </div>
                  </>
                )}
                {detail.status === 'approved' && (
                  <>
                    <textarea
                      value={paidNote}
                      onChange={(e) => setPaidNote(e.target.value)}
                      placeholder="线下打款流水号或备注（确认打款时必填）"
                      className="w-full min-h-20 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void runPaid()}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                    >
                      {busy === 'paid' ? '提交中…' : '确认打款'}
                    </button>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="若改为驳回，请填写原因"
                      className="w-full min-h-16 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void runReview(false)}
                      className="w-full px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer disabled:opacity-60"
                    >
                      {busy === 'reject' ? '提交中…' : '驳回并退回可提现'}
                    </button>
                  </>
                )}
              </div>
            ) : null
          }
        >
          <div className="space-y-2 rounded-xl border border-slate-100 p-4">
            <Kv label="专家" value={expertName(detail)} />
            <Kv label="手机号" value={detail.user?.phone || '—'} />
            <Kv label="渠道" value={channelText(detail.channel)} />
            <Kv label="收款账号" value={detail.account} />
            <Kv label="提现金额" value={yuan(detail.amountCents)} />
            <Kv label="手续费" value={yuan(detail.feeCents || 0)} />
            <Kv label="实到" value={yuan(detail.amountCents - (detail.feeCents || 0))} />
            <Kv label="状态" value={withdrawStatusLabel[detail.status] || detail.status} />
            <Kv label="申请时间" value={formatTime(detail.createdAt)} />
            <Kv label="审核时间" value={formatTime(detail.reviewedAt)} />
            <Kv label="打款时间" value={formatTime(detail.processedAt)} />
            <Kv label="备注" value={detail.reason} />
            <Kv label="打款流水" value={detail.paidNote} />
          </div>
        </SideDrawer>
      )}
    </div>
  );
};
