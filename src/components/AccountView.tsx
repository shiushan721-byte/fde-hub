import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Loader2,
  Lock,
  Pencil,
  Search,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import { isExpertRole } from '../utils/expertIdentity';
import { UserIdentityRole } from '../types/creator';

interface AccountViewProps {
  onOpenRecharge?: () => void;
  userRole?: UserIdentityRole;
  embedded?: boolean;
}

type PayChannel = 'alipay';
type LedgerTab = 'income' | 'withdraw';
type WithdrawFilter = 'all' | 'received' | 'processing' | 'failed';

type IncomeItem = {
  id: string;
  amountCents: number;
  title: string;
  sourceOrderNo: string;
  sourceBuyer: string;
  sourceAgent: string;
  createdAt: string;
  availableAt?: string | null;
  released: boolean;
};

type WithdrawalItem = {
  id: string;
  withdrawNo: string;
  amountCents: number;
  feeCents: number;
  channel: string;
  account: string;
  status: string;
  reason?: string;
  createdAt: string;
};

type WalletOverview = {
  pendingCents: number;
  availableCents: number;
  frozenCents: number;
  withdrawnTotalCents: number;
  withdrawnFeeCents: number;
  totalIncomeCents: number;
  withdrawFeeRate: number;
  withdrawFeeMinCents: number;
  pendingHoldDays: number;
  payout: {
    alipayBound: boolean;
    alipayAccount: string;
  };
  incomes: IncomeItem[];
  withdrawals: WithdrawalItem[];
};

async function loginExpertSession() {
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
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function toInputDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(value: string) {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(value: string) {
  const d = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function yuanPlain(cents: number) {
  return (Math.abs(cents) / 100).toFixed(2);
}

function yuanDisplay(cents: number) {
  return `¥ ${yuanPlain(cents)}`;
}

function maskAccount(account?: string) {
  const value = (account || '').trim();
  if (!value) return '';
  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    const head = name.slice(0, 1);
    return `${head}****@${domain}`;
  }
  const digits = value.replace(/\s/g, '');
  if (digits.length >= 7) {
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }
  if (digits.length >= 4) {
    return `${digits.slice(0, 2)}****${digits.slice(-2)}`;
  }
  return digits;
}

function withdrawStatusMeta(item: WithdrawalItem) {
  if (item.status === 'paid' || item.status === 'succeeded') {
    return { group: 'received' as const, text: '已到账', tone: 'default' as const };
  }
  if (item.status === 'pending' || item.status === 'approved') {
    return { group: 'processing' as const, text: '提取中', tone: 'default' as const };
  }
  if (item.status === 'rejected') {
    return {
      group: 'failed' as const,
      text: item.reason ? `提现失败：${item.reason}` : '提现失败',
      tone: 'danger' as const
    };
  }
  if (item.status === 'cancelled') {
    return { group: 'failed' as const, text: '已取消', tone: 'default' as const };
  }
  return { group: 'processing' as const, text: item.status || '—', tone: 'default' as const };
}

function feeFor(amountYuan: number, rate: number, minCents: number) {
  const amountCents = Math.round(amountYuan * 100);
  return Math.max(minCents, Math.round(amountCents * rate));
}

function inDateRange(iso: string, from: string, to: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const start = from ? startOfDay(from) : null;
  const end = to ? endOfDay(to) : null;
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

export const AccountView: React.FC<AccountViewProps> = ({ userRole = 'normal', embedded = false }) => {
  const isExpert = isExpertRole(userRole);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('income');
  const [alipayAccount, setAlipayAccount] = useState('');
  const [editingAccount, setEditingAccount] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawYuan, setWithdrawYuan] = useState('');
  const [busy, setBusy] = useState('');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datesInitialized, setDatesInitialized] = useState(false);
  const [withdrawFilter, setWithdrawFilter] = useState<WithdrawFilter>('all');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      await loginExpertSession();
      const data = await api<WalletOverview>('/api/wallet');
      setWallet(data);
      setAlipayAccount(data.payout.alipayAccount || '');
      if (!datesInitialized) {
        const stamps = [...data.incomes, ...data.withdrawals]
          .map((row) => new Date(row.createdAt).getTime())
          .filter((n) => Number.isFinite(n));
        if (stamps.length > 0) {
          setDateFrom(toInputDate(new Date(Math.min(...stamps))));
          setDateTo(toInputDate(new Date()));
        } else {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 30);
          setDateFrom(toInputDate(start));
          setDateTo(toInputDate(end));
        }
        setDatesInitialized(true);
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载收益失败');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isExpert) {
      setLoading(false);
      return;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpert]);

  const feePreview = useMemo(() => {
    if (!wallet) return 0;
    const n = Number(withdrawYuan);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return feeFor(n, wallet.withdrawFeeRate, wallet.withdrawFeeMinCents);
  }, [withdrawYuan, wallet]);

  const filteredIncomes = useMemo(() => {
    if (!wallet) return [];
    const q = query.trim().toLowerCase();
    return wallet.incomes.filter((row) => {
      if (!inDateRange(row.createdAt, dateFrom, dateTo)) return false;
      if (!q) return true;
      return [row.sourceOrderNo, row.sourceAgent, row.sourceBuyer, row.title, yuanPlain(row.amountCents)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [wallet, query, dateFrom, dateTo]);

  const filteredWithdrawals = useMemo(() => {
    if (!wallet) return [];
    const q = query.trim().toLowerCase();
    return wallet.withdrawals.filter((row) => {
      if (!inDateRange(row.createdAt, dateFrom, dateTo)) return false;
      const meta = withdrawStatusMeta(row);
      if (withdrawFilter !== 'all' && meta.group !== withdrawFilter) return false;
      if (!q) return true;
      return [row.withdrawNo, row.account, meta.text, yuanPlain(row.amountCents)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [wallet, query, dateFrom, dateTo, withdrawFilter]);

  const bindAccount = async () => {
    const account = alipayAccount.trim();
    if (!account) {
      alert('请填写支付宝账号');
      return;
    }
    setBusy('bind-alipay');
    try {
      await api('/api/wallet/payout-accounts', {
        method: 'POST',
        body: JSON.stringify({ channel: 'alipay', account })
      });
      setEditingAccount(false);
      const next = await reload();
      if (withdrawOpen && next) {
        const availableYuan = (next.availableCents / 100).toFixed(2);
        setWithdrawYuan(next.availableCents > 0 ? availableYuan : '');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '绑定失败');
    } finally {
      setBusy('');
    }
  };

  const openWithdraw = () => {
    if (!wallet) return;
    if (!wallet.payout.alipayBound) {
      setEditingAccount(true);
      setWithdrawOpen(true);
      return;
    }
    const availableYuan = (wallet.availableCents / 100).toFixed(2);
    setWithdrawYuan(wallet.availableCents > 0 ? availableYuan : '');
    setWithdrawOpen(true);
  };

  const submitWithdraw = async () => {
    const amountYuan = Number(withdrawYuan);
    if (!Number.isFinite(amountYuan) || amountYuan <= 0) {
      alert('请输入提现金额');
      return;
    }
    setBusy('withdraw');
    try {
      await api('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ channel: 'alipay' satisfies PayChannel, amountYuan })
      });
      setWithdrawYuan('');
      setWithdrawOpen(false);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '提现失败');
    } finally {
      setBusy('');
    }
  };

  if (!isExpert) {
    return (
      <div className="max-w-lg py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Lock size={22} />
        </div>
        <h1 className="text-xl font-black text-slate-900">我的收益仅对 AI 专家开放</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          交易流水与提现记录属于专家经营收益。请切换到 AI 专家身份后查看。
        </p>
      </div>
    );
  }

  const feePct = wallet ? Math.round(wallet.withdrawFeeRate * 100) : 1;
  const holdDays = wallet?.pendingHoldDays ?? 7;
  const masked = maskAccount(wallet?.payout.alipayAccount);

  return (
    <div id="account-view" className={`space-y-5 ${embedded ? 'pb-4' : 'pb-16'}`}>
      {!embedded && <h1 className="text-2xl font-black text-slate-900 font-display">我的收益</h1>}

      {loading && !wallet && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {wallet && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs min-h-[148px] flex flex-col">
              <div className="text-sm text-slate-500">可提现金额</div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div className="text-[28px] leading-tight font-extrabold text-slate-900 font-display tabular-nums">
                  {yuanDisplay(wallet.availableCents)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingAccount && !withdrawOpen ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        value={alipayAccount}
                        onChange={(e) => setAlipayAccount(e.target.value)}
                        placeholder="支付宝账号"
                        className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                      />
                      <button
                        type="button"
                        disabled={busy === 'bind-alipay'}
                        onClick={() => void bindAccount()}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        {busy === 'bind-alipay' ? '…' : '保存'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAlipayAccount(wallet.payout.alipayAccount || '');
                        setEditingAccount(true);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{masked ? `收款账号：${masked}` : '绑定支付宝'}</span>
                      <Pencil size={11} className="text-slate-400" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openWithdraw}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800"
                  >
                    提现
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3">可提现至支付宝，每笔扣除手续费</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs min-h-[148px] flex flex-col">
              <div className="text-sm text-slate-500">总收入</div>
              <div className="text-[28px] leading-tight font-extrabold text-slate-900 font-display mt-3 tabular-nums">
                {yuanDisplay(wallet.totalIncomeCents)}
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3">当前累积赚取的所有收入</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs min-h-[148px] flex flex-col">
              <div className="text-sm text-slate-500">待入账</div>
              <div className="text-[28px] leading-tight font-extrabold text-slate-900 font-display mt-3 tabular-nums">
                {yuanDisplay(wallet.pendingCents)}
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3">
                用户已付但未到结算期，T+{holdDays} 后可提现
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs min-h-[148px] flex flex-col">
              <div className="text-sm text-slate-500">提现中</div>
              <div className="text-[28px] leading-tight font-extrabold text-slate-900 font-display mt-3 tabular-nums">
                {yuanDisplay(wallet.frozenCents || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-auto pt-3">已申请提现，平台正在审核中</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="px-5 pt-4 pb-3 flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setLedgerTab('income')}
                  className={`text-sm cursor-pointer pb-1 border-b-2 ${
                    ledgerTab === 'income'
                      ? 'font-bold text-slate-900 border-slate-900'
                      : 'font-medium text-slate-400 border-transparent hover:text-slate-700'
                  }`}
                >
                  交易流水
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerTab('withdraw')}
                  className={`text-sm cursor-pointer pb-1 border-b-2 ${
                    ledgerTab === 'withdraw'
                      ? 'font-bold text-slate-900 border-slate-900'
                      : 'font-medium text-slate-400 border-transparent hover:text-slate-700'
                  }`}
                >
                  提现记录
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white text-xs text-slate-600">
                  <CalendarDays size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer min-w-[118px]"
                  />
                  <span className="text-slate-300">—</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer min-w-[118px]"
                  />
                </div>
                {ledgerTab === 'withdraw' && (
                  <select
                    value={withdrawFilter}
                    onChange={(e) => setWithdrawFilter(e.target.value as WithdrawFilter)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 cursor-pointer"
                  >
                    <option value="all">全部状态</option>
                    <option value="received">已到账</option>
                    <option value="processing">提取中</option>
                    <option value="failed">提现失败</option>
                  </select>
                )}
                <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white min-w-[180px]">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索"
                    className="flex-1 bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {ledgerTab === 'income' ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 text-xs text-slate-400">
                      <th className="px-5 py-3 font-medium">时间</th>
                      <th className="px-5 py-3 font-medium">交易订单号</th>
                      <th className="px-5 py-3 font-medium">智能体</th>
                      <th className="px-5 py-3 font-medium">客户</th>
                      <th className="px-5 py-3 font-medium text-right">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncomes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-xs text-slate-400">
                          暂无交易流水
                        </td>
                      </tr>
                    ) : (
                      filteredIncomes.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                          <td className="px-5 py-4 text-slate-600 whitespace-nowrap tabular-nums">
                            {formatDateTime(tx.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-slate-800 font-medium">{tx.sourceOrderNo || tx.title || '—'}</td>
                          <td className="px-5 py-4 text-slate-700">{tx.sourceAgent || '—'}</td>
                          <td className="px-5 py-4 text-slate-700">{tx.sourceBuyer || '—'}</td>
                          <td className="px-5 py-4 text-right text-slate-900 font-semibold tabular-nums">
                            {yuanPlain(tx.amountCents)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 text-xs text-slate-400">
                      <th className="px-5 py-3 font-medium">时间</th>
                      <th className="px-5 py-3 font-medium">关联订单</th>
                      <th className="px-5 py-3 font-medium text-right">提取金额 (¥)</th>
                      <th className="px-5 py-3 font-medium text-right">服务费 ({feePct}%)</th>
                      <th className="px-5 py-3 font-medium text-right">到账金额 (¥)</th>
                      <th className="px-5 py-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center text-xs text-slate-400">
                          暂无提现记录
                        </td>
                      </tr>
                    ) : (
                      filteredWithdrawals.map((w) => {
                        const meta = withdrawStatusMeta(w);
                        return (
                          <tr key={w.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                            <td className="px-5 py-4 text-slate-600 whitespace-nowrap tabular-nums">
                              {formatDateTime(w.createdAt)}
                            </td>
                            <td className="px-5 py-4 text-slate-800 font-medium">{w.withdrawNo}</td>
                            <td className="px-5 py-4 text-right text-slate-900 font-semibold tabular-nums">
                              {yuanPlain(w.amountCents)}
                            </td>
                            <td className="px-5 py-4 text-right text-slate-700 tabular-nums">
                              {yuanPlain(w.feeCents)}
                            </td>
                            <td className="px-5 py-4 text-right text-slate-900 font-semibold tabular-nums">
                              {yuanPlain(w.amountCents - w.feeCents)}
                            </td>
                            <td
                              className={`px-5 py-4 ${
                                meta.tone === 'danger' ? 'text-rose-500 font-medium' : 'text-slate-800'
                              }`}
                            >
                              {meta.text}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {withdrawOpen && wallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => busy || setWithdrawOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">提现到支付宝</h3>
              <button
                type="button"
                onClick={() => setWithdrawOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {!wallet.payout.alipayBound || editingAccount ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">请先绑定用于收款的支付宝账号。</p>
                <input
                  value={alipayAccount}
                  onChange={(e) => setAlipayAccount(e.target.value)}
                  placeholder="支付宝账号 / 手机号"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  disabled={busy === 'bind-alipay'}
                  onClick={() => void bindAccount()}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
                >
                  {busy === 'bind-alipay' ? '保存中…' : '保存并继续'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  可提现 {yuanDisplay(wallet.availableCents)} · 手续费 {feePct}%，单笔最低{' '}
                  {yuanDisplay(wallet.withdrawFeeMinCents)}。提交后进入平台审核打款。
                </p>
                <div className="text-xs text-slate-500">
                  收款账号：{maskAccount(wallet.payout.alipayAccount)}
                </div>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={withdrawYuan}
                  onChange={(e) => setWithdrawYuan(e.target.value)}
                  placeholder="提现金额（元）"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
                {feePreview > 0 && (
                  <p className="text-xs text-slate-500">
                    手续费 {yuanDisplay(feePreview)} · 预计到账{' '}
                    {yuanDisplay(Math.round(Number(withdrawYuan) * 100) - feePreview)}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy === 'withdraw'}
                  onClick={() => void submitWithdraw()}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                >
                  {busy === 'withdraw' && <Loader2 size={14} className="animate-spin" />}
                  确认提现
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
