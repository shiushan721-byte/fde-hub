import React, { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';
import { api } from '../lib/api';
import { yuan } from '../lib/customOrderLabels';

export type PayChannel = 'wechat' | 'alipay';

export const PaymentCheckoutDrawer: React.FC<{
  orderId: string;
  orderNo?: string;
  title?: string;
  amountCents: number;
  deadlineAt?: string;
  onClose: () => void;
  onPaid: () => void;
}> = ({ orderId, orderNo, title, amountCents, deadlineAt, onClose, onPaid }) => {
  const [channel, setChannel] = useState<PayChannel>('wechat');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isWechat = channel === 'wechat';

  const confirmPay = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/custom-orders/${orderId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ channel })
      });
      await api(`/api/custom-orders/${orderId}/confirm-escrow`, {
        method: 'POST',
        body: JSON.stringify({ channel })
      });
      setSuccess(true);
      setTimeout(() => onPaid(), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : '支付失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="定制订单支付"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900">支付并托管</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{orderNo || title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {success ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-base font-bold text-slate-900">支付成功</h4>
              <p className="text-xs text-slate-500">款项已进入平台托管，专家可以开始交付。</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-1">
                <div className="text-[11px] text-slate-400">应付金额（平台托管）</div>
                <div className="text-3xl font-black tracking-tight">{yuan(amountCents)}</div>
                {title && <div className="text-xs text-slate-300 pt-1 truncate">{title}</div>}
                {deadlineAt && (
                  <div className="text-[11px] text-amber-300">
                    请于 {new Date(deadlineAt).toLocaleString('zh-CN')} 前完成支付
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 mb-2">支付方式</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setChannel('wechat')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer ${
                      isWechat
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">微信</span>
                    <span className="text-[10px] font-medium text-slate-500">微信支付</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('alipay')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer ${
                      !isWechat
                        ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">支付宝</span>
                    <span className="text-[10px] font-medium text-slate-500">支付宝支付</span>
                  </button>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  isWechat ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
                }`}
              >
                <div className="text-xs font-bold text-slate-800">
                  {isWechat ? '请使用微信扫码支付' : '请使用支付宝扫码支付'}
                </div>
                <div className="flex justify-center">
                  <MockQr channel={channel} seed={orderId} />
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  演示环境：扫码不会真实扣款，点击下方按钮模拟支付成功。
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck size={14} className="text-blue-600 mt-0.5 shrink-0" />
                <p>
                  资金由平台托管至验收完成。验收通过并过观察期后，扣除平台服务费，结算至专家可提现余额。
                </p>
              </div>

              {error && <p className="text-xs text-rose-600">{error}</p>}
            </>
          )}
        </div>

        {!success && (
          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmPay()}
              className={`w-full py-3 rounded-xl text-white text-sm font-bold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${
                isWechat ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? '支付处理中…' : `确认${isWechat ? '微信' : '支付宝'}支付 ${yuan(amountCents)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function MockQr({ channel, seed }: { channel: PayChannel; seed: string }) {
  const cells = 7;
  const bits: boolean[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i) + channel.length) % 2147483647;
  for (let i = 0; i < cells * cells; i++) {
    h = (h * 1103515245 + 12345) % 2147483647;
    const row = Math.floor(i / cells);
    const col = i % cells;
    const finder = (row < 2 && col < 2) || (row < 2 && col > cells - 3) || (row > cells - 3 && col < 2);
    bits.push(finder || h % 3 !== 0);
  }
  const color = channel === 'wechat' ? '#07C160' : '#1677FF';
  return (
    <div className="w-40 h-40 bg-white rounded-xl border border-slate-200 p-2 grid grid-cols-7 gap-0.5">
      {bits.map((on, i) => (
        <div key={i} className="rounded-[1px]" style={{ background: on ? color : '#E2E8F0' }} />
      ))}
    </div>
  );
}
