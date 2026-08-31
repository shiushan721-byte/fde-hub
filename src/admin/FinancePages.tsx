import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';

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
  baseAgentTitle?: string;
  baseAgentVersion?: string;
  status: string;
  paymentStatus: string;
  paymentChannel?: string;
  priceCents: number;
  paidAt?: string | null;
  escrowedAt?: string | null;
  settlementEligibleAt?: string | null;
  buyer?: { id?: string; name?: string; email?: string; phone?: string } | null;
  seller?: { id?: string; name?: string; email?: string; phone?: string } | null;
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
  const { data, error, loading } = useAdminQuery<EscrowRow[]>('/api/admin/escrows');
  const [orderNo, setOrderNo] = useState('');
  const [phone, setPhone] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
        const due = row.settlementEligibleAt
          ? new Date(row.settlementEligibleAt).getTime()
          : NaN;
        if (!Number.isFinite(due)) return false;
        if (fromTs != null && due < fromTs) return false;
        if (toTs != null && due > toTs) return false;
      }

      return true;
    });
  }, [data, orderNo, phone, dateFrom, dateTo]);

  const inputClass =
    'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">资金托管</h1>
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
          <span className="block text-[11px] text-slate-500">到期开始</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">到期结束</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClass}
          />
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
              <th className="text-left p-3">资金托管到期时间</th>
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
                <td className="p-3 text-slate-500 whitespace-nowrap">
                  {formatTime(row.settlementEligibleAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无匹配的托管订单</p>
        )}
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
  const [phone, setPhone] = useState('');
  const [alipayAccount, setAlipayAccount] = useState('');
  const [withdrawNo, setWithdrawNo] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const reviewRows = useMemo(
    () => (data || []).filter((w) => w.status === 'pending' || w.status === 'approved'),
    [data]
  );

  const rows = useMemo(() => {
    const base = tab === 'review' ? reviewRows : data || [];
    const phoneQ = phone.trim();
    const accountQ = alipayAccount.trim().toLowerCase();
    const noQ = withdrawNo.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return base.filter((w) => {
      if (phoneQ && !(w.user?.phone || '').includes(phoneQ)) return false;
      if (accountQ && !(w.account || '').toLowerCase().includes(accountQ)) return false;
      if (noQ && !(w.withdrawNo || '').toLowerCase().includes(noQ)) return false;
      if (status && w.status !== status) return false;

      if (fromTs != null || toTs != null) {
        const created = w.createdAt ? new Date(w.createdAt).getTime() : NaN;
        if (!Number.isFinite(created)) return false;
        if (fromTs != null && created < fromTs) return false;
        if (toTs != null && created > toTs) return false;
      }

      return true;
    });
  }, [
    tab,
    reviewRows,
    data,
    phone,
    alipayAccount,
    withdrawNo,
    status,
    dateFrom,
    dateTo
  ]);

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

  const inputClass =
    'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">提现管理</h1>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">手机号</span>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="专家手机号"
            className={`${inputClass} w-36`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">支付宝账号</span>
          <input
            type="text"
            value={alipayAccount}
            onChange={(e) => setAlipayAccount(e.target.value)}
            placeholder="收款账号"
            className={`${inputClass} w-40`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">提现单号</span>
          <input
            type="text"
            value={withdrawNo}
            onChange={(e) => setWithdrawNo(e.target.value)}
            placeholder="单号"
            className={`${inputClass} w-44`}
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
            <option value="pending">待审核</option>
            <option value="approved">已通过待打款</option>
            <option value="paid">已打款</option>
            <option value="rejected">已驳回</option>
            <option value="succeeded">已到账</option>
            <option value="cancelled">已取消</option>
          </select>
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
      </div>
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
        {!loading && rows.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">
            {tab === 'review' ? '暂无待处理提现' : '暂无匹配的提现记录'}
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

type FinanceSettingsDto = {
  id: string;
  fallbackFeeRateBps: number;
  acceptanceDays: number;
  settlementHoldHours: number;
  pendingHoldDays: number;
  updatedAt?: string;
};

type FinanceRuleField = 'fallbackFeeRateBps' | 'acceptanceDays' | 'pendingHoldDays';

function bpsToPercentInput(bps: number) {
  return (bps / 100).toFixed(2);
}

function percentInputToBps(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

export const FinanceRulesPage = () => {
  const { data, error, loading, reload } = useAdminQuery<{
    settings: FinanceSettingsDto;
  }>('/api/admin/finance-settings');

  const [fallbackPercent, setFallbackPercent] = useState('');
  const [acceptanceDays, setAcceptanceDays] = useState('');
  const [pendingHoldDays, setPendingHoldDays] = useState('');
  const [savingField, setSavingField] = useState<FinanceRuleField | ''>('');

  useEffect(() => {
    if (!data?.settings) return;
    setFallbackPercent(bpsToPercentInput(data.settings.fallbackFeeRateBps));
    setAcceptanceDays(String(data.settings.acceptanceDays));
    setPendingHoldDays(String(data.settings.pendingHoldDays));
  }, [data?.settings]);

  const inputClass =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';

  const saveField = async (field: FinanceRuleField) => {
    let payload: Partial<Record<FinanceRuleField, number>> = {};

    if (field === 'fallbackFeeRateBps') {
      const fallbackFeeRateBps = percentInputToBps(fallbackPercent);
      if (fallbackFeeRateBps == null) {
        alert('服务费率请输入 0–100 的数字，如 10 表示 10%');
        return;
      }
      payload = { fallbackFeeRateBps };
    } else if (field === 'acceptanceDays') {
      const days = Number(acceptanceDays);
      if (!Number.isInteger(days) || days < 1 || days > 90) {
        alert('用户验收天数须为 1–90 的整数');
        return;
      }
      payload = { acceptanceDays: days };
    } else {
      const hold = Number(pendingHoldDays);
      if (!Number.isInteger(hold) || hold < 0 || hold > 90) {
        alert('待提现冻结天数须为 0–90 的整数');
        return;
      }
      payload = { pendingHoldDays: hold };
    }

    setSavingField(field);
    try {
      await api('/api/admin/finance-settings', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingField('');
    }
  };

  const modules: {
    field: FinanceRuleField;
    title: string;
    hint: string;
    input: React.ReactNode;
  }[] = [
    {
      field: 'fallbackFeeRateBps',
      title: '托底服务费率',
      hint: '订单支付成功后按此比例收取平台服务费',
      input: (
        <input
          type="number"
          step="0.01"
          min={0}
          max={100}
          value={fallbackPercent}
          onChange={(e) => setFallbackPercent(e.target.value)}
          className={inputClass}
        />
      )
    },
    {
      field: 'acceptanceDays',
      title: '用户验收天数',
      hint: '推送后未确认则自动验收',
      input: (
        <input
          type="number"
          min={1}
          max={90}
          value={acceptanceDays}
          onChange={(e) => setAcceptanceDays(e.target.value)}
          className={inputClass}
        />
      )
    },
    {
      field: 'pendingHoldDays',
      title: '待提现冻结天数',
      hint: '待提现 → 可提现（单位：天）',
      input: (
        <input
          type="number"
          min={0}
          max={90}
          value={pendingHoldDays}
          onChange={(e) => setPendingHoldDays(e.target.value)}
          className={inputClass}
        />
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">费率与结算规则</h1>
        <p className="text-xs text-slate-500 mt-1">
          配置平台服务费率、验收与待提现冻结规则；修改后仅影响之后新写入的截止时间。
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="space-y-3 max-w-md">
        {modules.map((mod) => (
          <div
            key={mod.field}
            className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
          >
            <div>
              <div className="text-sm font-black">{mod.title}</div>
              <p className="text-[11px] text-slate-500 mt-1">{mod.hint}</p>
            </div>
            {mod.input}
            <button
              type="button"
              disabled={savingField === mod.field}
              onClick={() => void saveField(mod.field)}
              className="self-start px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {savingField === mod.field ? '保存中…' : '保存'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

type FinanceAccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  balanceCents: number;
  sortOrder: number;
};

type FinanceLedgerRow = {
  id: string;
  flowNo: string;
  amountCents: number;
  balanceAfterCents: number;
  bizOrderNo: string;
  bizType: string;
  operationType: string;
  createdAt: string;
  account?: { id: string; code: string; name: string; type: string } | null;
  journal?: {
    operatorName?: string;
    operatorId?: string;
    remark?: string;
  } | null;
};

export const FinanceBalancesPage = () => {
  const { data, error, loading } = useAdminQuery<FinanceAccountRow[]>('/api/admin/finance-accounts');
  const rows = data || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">余额管理</h1>
        <p className="text-xs text-slate-500 mt-1">平台财务科目余额，用于对账核对</p>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">账户名称</th>
              <th className="text-left p-3">账户类型</th>
              <th className="text-right p-3">账户余额(元)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 tabular-nums">{index + 1}</td>
                <td className="p-3 font-bold text-slate-900">{row.name}</td>
                <td className="p-3">
                  {row.type === 'income' ? (
                    <span className="text-emerald-700 font-bold">收入</span>
                  ) : (
                    <span className="text-amber-700 font-bold">支出</span>
                  )}
                </td>
                <td className="p-3 text-right font-black tabular-nums">{yuan(row.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无财务科目</p>
        )}
      </div>
    </div>
  );
};

export const FinanceLedgerPage = () => {
  const [flowNo, setFlowNo] = useState('');
  const [bizOrderNo, setBizOrderNo] = useState('');
  const [accountId, setAccountId] = useState('');
  const [bizType, setBizType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState({
    flowNo: '',
    bizOrderNo: '',
    accountId: '',
    bizType: '',
    dateFrom: '',
    dateTo: ''
  });

  const accountsQuery = useAdminQuery<FinanceAccountRow[]>('/api/admin/finance-accounts');
  const qs = new URLSearchParams();
  if (applied.flowNo) qs.set('flowNo', applied.flowNo);
  if (applied.bizOrderNo) qs.set('bizOrderNo', applied.bizOrderNo);
  if (applied.accountId) qs.set('accountId', applied.accountId);
  if (applied.bizType) qs.set('bizType', applied.bizType);
  if (applied.dateFrom) qs.set('dateFrom', applied.dateFrom);
  if (applied.dateTo) qs.set('dateTo', applied.dateTo);
  const path = `/api/admin/finance-ledger${qs.toString() ? `?${qs}` : ''}`;
  const { data, error, loading, reload } = useAdminQuery<FinanceLedgerRow[]>(
    path,
    qs.toString()
  );

  const inputClass =
    'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';
  const rows = data || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">账户变动明细</h1>
        <p className="text-xs text-slate-500 mt-1">
          按财务流水与业务单号核对科目变动（支付托管、结算释放、提现出入账）
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">财务流水号</span>
          <input
            type="text"
            value={flowNo}
            onChange={(e) => setFlowNo(e.target.value)}
            placeholder="FLOW…"
            className={`${inputClass} w-44`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">业务单号</span>
          <input
            type="text"
            value={bizOrderNo}
            onChange={(e) => setBizOrderNo(e.target.value)}
            placeholder="订单号 / 提现单号"
            className={`${inputClass} w-44`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">财务账户</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={`${inputClass} max-w-[220px]`}
          >
            <option value="">全部</option>
            {(accountsQuery.data || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">业务类型</span>
          <select
            value={bizType}
            onChange={(e) => setBizType(e.target.value)}
            className={inputClass}
          >
            <option value="">全部</option>
            <option value="payment">支付托管</option>
            <option value="settlement">订单结算</option>
            <option value="withdrawal">提现</option>
          </select>
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
        <button
          type="button"
          onClick={() =>
            setApplied({
              flowNo: flowNo.trim(),
              bizOrderNo: bizOrderNo.trim(),
              accountId,
              bizType,
              dateFrom,
              dateTo
            })
          }
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
        >
          查询
        </button>
        <button
          type="button"
          onClick={() => void reload()}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
        >
          刷新
        </button>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-xs min-w-[960px]">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">财务流水号</th>
              <th className="text-left p-3">业务单号</th>
              <th className="text-left p-3">财务账户</th>
              <th className="text-left p-3">操作类型</th>
              <th className="text-right p-3">变动金额</th>
              <th className="text-right p-3">余额</th>
              <th className="text-left p-3">操作人</th>
              <th className="text-left p-3">时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 tabular-nums">{rows.length - index}</td>
                <td className="p-3 font-mono text-[11px] whitespace-nowrap">{row.flowNo}</td>
                <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                  {row.bizOrderNo || '—'}
                </td>
                <td className="p-3">
                  <div className="font-bold">{row.account?.name || '—'}</div>
                  <div className="text-slate-400 text-[10px]">
                    {row.account?.type === 'income' ? '收入' : '支出'}
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">{row.operationType || '—'}</td>
                <td
                  className={`p-3 text-right font-bold tabular-nums ${
                    row.amountCents >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {row.amountCents >= 0 ? '+' : ''}
                  {yuan(row.amountCents)}
                </td>
                <td className="p-3 text-right tabular-nums">{yuan(row.balanceAfterCents)}</td>
                <td className="p-3 text-slate-500">
                  {row.journal?.operatorName || row.journal?.operatorId || '—'}
                </td>
                <td className="p-3 text-slate-500 whitespace-nowrap">
                  {formatTime(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无匹配的变动明细</p>
        )}
      </div>
    </div>
  );
};
