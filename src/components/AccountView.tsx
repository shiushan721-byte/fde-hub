import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Landmark,
  Loader2,
  Lock
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

type PayChannel = 'wechat' | 'alipay';

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
    wechatBound: boolean;
    wechatAccount: string;
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

function withdrawStatusText(status?: string) {
  if (status === 'pending') return '待平台审核';
  if (status === 'approved') return '审核通过，待打款';
  if (status === 'rejected') return '已驳回';
  if (status === 'paid' || status === 'succeeded') return '已到账';
  if (status === 'cancelled') return '已取消';
  return status || '—';
}

function channelText(channel?: string) {
  if (channel === 'wechat') return '微信支付';
  if (channel === 'alipay') return '支付宝';
  return '—';
}

function yuanPlain(cents: number) {
  return `￥${(Math.abs(cents) / 100).toFixed(2)}`;
}

function feeFor(amountYuan: number, rate: number, minCents: number) {
  const amountCents = Math.round(amountYuan * 100);
  return Math.max(minCents, Math.round(amountCents * rate));
}

export const AccountView: React.FC<AccountViewProps> = ({ userRole = 'normal', embedded = false }) => {
  const isExpert = isExpertRole(userRole);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const [ledgerTab, setLedgerTab] = useState<'income' | 'withdraw'>('income');
  const [wechatAccount, setWechatAccount] = useState('');
  const [alipayAccount, setAlipayAccount] = useState('');
  const [withdrawChannel, setWithdrawChannel] = useState<PayChannel>('wechat');
  const [withdrawYuan, setWithdrawYuan] = useState('');
  const [busy, setBusy] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      await loginExpertSession();
      const data = await api<WalletOverview>('/api/wallet');
      setWallet(data);
      setWechatAccount(data.payout.wechatAccount || '');
      setAlipayAccount(data.payout.alipayAccount || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载账户失败');
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

  const bindAccount = async (channel: PayChannel) => {
    const account = (channel === 'wechat' ? wechatAccount : alipayAccount).trim();
    setBusy(`bind-${channel}`);
    try {
      await api('/api/wallet/payout-accounts', {
        method: 'POST',
        body: JSON.stringify({ channel, account })
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '绑定失败');
    } finally {
      setBusy('');
    }
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
        body: JSON.stringify({ channel: withdrawChannel, amountYuan })
      });
      setWithdrawYuan('');
      await reload();
      alert('已提交待平台审核，审核通过并打款后计入已提现。');
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
        <h1 className="text-xl font-black text-slate-900">账户资金仅对 AI 专家开放</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          待提现、可提现与已提现记录的是专家定制收益。请切换到 AI 专家身份后查看。
        </p>
      </div>
    );
  }

  return (
    <div id="account-view" className={`space-y-8 ${embedded ? 'pb-4' : 'pb-16'}`}>
      <div>
        {!embedded && <h1 className="text-2xl font-black text-slate-900 font-display">账户</h1>}
        <p className={`text-xs text-slate-500 ${embedded ? '' : 'mt-1'}`}>
          定制进入待验收即计入待提现，T+7 后可提现；提现需平台审核打款
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {wallet && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">待提现</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-display">
                {yuanPlain(wallet.pendingCents)}
              </div>
              <p className="text-[11px] text-slate-500">用户待验收起算，满 {wallet.pendingHoldDays} 天转入可提现</p>
            </div>
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">可提现</span>
                <Wallet size={16} className="text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold font-display">{yuanPlain(wallet.availableCents)}</div>
              <p className="text-[11px] text-slate-300">可提到微信或支付宝，每笔扣手续费</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">在途提现</span>
                <Clock size={16} className="text-blue-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-display">
                {yuanPlain(wallet.frozenCents || 0)}
              </div>
              <p className="text-[11px] text-slate-500">已申请、待平台审核或待打款</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">已提现</span>
                <ArrowUpRight size={16} className="text-slate-400" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-display">
                {yuanPlain(wallet.withdrawnTotalCents)}
              </div>
              <p className="text-[11px] text-slate-500">
                累计手续费 {yuanPlain(wallet.withdrawnFeeCents)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2">
                <Landmark size={16} className="text-slate-500" />
                <h3 className="font-bold text-slate-900 text-sm">收款账号</h3>
              </div>
              <label className="block text-xs space-y-1.5">
                <span className="font-bold text-slate-700">微信</span>
                <div className="flex gap-2">
                  <input
                    value={wechatAccount}
                    onChange={(e) => setWechatAccount(e.target.value)}
                    placeholder="微信号"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    disabled={busy === 'bind-wechat'}
                    onClick={() => void bindAccount('wechat')}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    {wallet.payout.wechatBound ? '更新' : '绑定'}
                  </button>
                </div>
              </label>
              <label className="block text-xs space-y-1.5">
                <span className="font-bold text-slate-700">支付宝</span>
                <div className="flex gap-2">
                  <input
                    value={alipayAccount}
                    onChange={(e) => setAlipayAccount(e.target.value)}
                    placeholder="支付宝账号"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    disabled={busy === 'bind-alipay'}
                    onClick={() => void bindAccount('alipay')}
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    {wallet.payout.alipayBound ? '更新' : '绑定'}
                  </button>
                </div>
              </label>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm">提现</h3>
              <p className="text-[11px] text-slate-500">
                可提现 {yuanPlain(wallet.availableCents)} · 手续费 {(wallet.withdrawFeeRate * 100).toFixed(0)}%，单笔最低{' '}
                {yuanPlain(wallet.withdrawFeeMinCents)}。提交后进入审核，不是立即到账。
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawChannel('wechat')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    withdrawChannel === 'wechat'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  提到微信
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawChannel('alipay')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    withdrawChannel === 'alipay'
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  提到支付宝
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={10}
                  step={1}
                  value={withdrawYuan}
                  onChange={(e) => setWithdrawYuan(e.target.value)}
                  placeholder="提现金额（元）"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <button
                  type="button"
                  disabled={busy === 'withdraw'}
                  onClick={() => void submitWithdraw()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60 inline-flex items-center gap-1"
                >
                  {busy === 'withdraw' && <Loader2 size={12} className="animate-spin" />}
                  提现
                </button>
              </div>
              {feePreview > 0 && (
                <p className="text-[11px] text-slate-500">
                  手续费 {yuanPlain(feePreview)} · 预计到账 {yuanPlain(Math.round(Number(withdrawYuan) * 100) - feePreview)}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900 text-base">资金流水</h3>
              <div className="flex rounded-xl border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setLedgerTab('income')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                    ledgerTab === 'income' ? 'bg-slate-900 text-white' : 'text-slate-500'
                  }`}
                >
                  总收入 {yuanPlain(wallet.totalIncomeCents)}
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerTab('withdraw')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                    ledgerTab === 'withdraw' ? 'bg-slate-900 text-white' : 'text-slate-500'
                  }`}
                >
                  已提现 {yuanPlain(wallet.withdrawnTotalCents)}
                </button>
              </div>
            </div>

            {ledgerTab === 'income' && (
              <div className="divide-y divide-slate-100">
                {wallet.incomes.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">暂无收入</p>
                )}
                {wallet.incomes.map((tx) => (
                  <div key={tx.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownLeft size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          {tx.sourceOrderNo || tx.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          来自定制 · 客户 {tx.sourceBuyer || '—'} · {tx.sourceAgent || '智能体'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(tx.createdAt).toLocaleString('zh-CN')}
                          {tx.released
                            ? ' · 已入可提现'
                            : tx.availableAt
                              ? ` · ${new Date(tx.availableAt).toLocaleDateString('zh-CN')} 后可提现`
                              : ' · 待提现'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 shrink-0">+{yuanPlain(tx.amountCents)}</div>
                  </div>
                ))}
              </div>
            )}

            {ledgerTab === 'withdraw' && (
              <div className="divide-y divide-slate-100">
                {wallet.withdrawals.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">暂无提现</p>
                )}
                {wallet.withdrawals.map((w) => (
                  <div key={w.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <ArrowUpRight size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          {w.withdrawNo} · {channelText(w.channel)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          到账 {w.account} · 手续费 {yuanPlain(w.feeCents)} · 实到{' '}
                          {yuanPlain(w.amountCents - w.feeCents)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(w.createdAt).toLocaleString('zh-CN')} · {withdrawStatusText(w.status)}
                          {w.status === 'rejected' && w.reason ? ` · ${w.reason}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-900 shrink-0">-{yuanPlain(w.amountCents)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
