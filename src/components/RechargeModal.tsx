import React, { useState } from 'react';
import { X, CreditCard, Sparkles, CheckCircle2, ShieldCheck, Zap, Bot, ArrowRight, HeartHandshake } from 'lucide-react';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAgentTitle?: string;
  targetAuthorName?: string;
  onSuccess?: (amount: number, tokens: number) => void;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  targetAgentTitle,
  targetAuthorName,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [selectedPackIndex, setSelectedPackIndex] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [isSuccess, setIsSuccess] = useState(false);

  const tokenPacks = [
    {
      price: 50,
      tokens: 5000000,
      tokensFormatted: '500万 Token',
      callsEstimate: '约 1,200 次推理',
      bonus: '',
      popular: false
    },
    {
      price: 100,
      tokens: 12000000,
      tokensFormatted: '1,200万 Token',
      callsEstimate: '约 3,000 次推理',
      bonus: '送 200万 Token',
      popular: true
    },
    {
      price: 300,
      tokens: 42000000,
      tokensFormatted: '4,200万 Token',
      callsEstimate: '约 10,000 次推理',
      bonus: '送 1,200万 Token',
      popular: false
    },
    {
      price: 500,
      tokens: 80000000,
      tokensFormatted: '8,000万 Token',
      callsEstimate: '约 22,000 次推理',
      bonus: '送 3,000万 Token + 优先推理通道',
      popular: false
    },
    {
      price: 1000,
      tokens: 180000000,
      tokensFormatted: '1.8亿 Token',
      callsEstimate: '企业高并发专用',
      bonus: '送 8,000万 Token + 专属顾问',
      popular: false
    }
  ];

  const selectedPack = tokenPacks[selectedPackIndex];

  const handlePay = () => {
    setIsSuccess(true);
    if (onSuccess) {
      onSuccess(selectedPack.price, selectedPack.tokens);
    }
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1600);
  };

  return (
    <div
      id="recharge-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="recharge-modal-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">账户 Token 算力充值</h3>
              <p className="text-[11px] text-amber-100">
                购买模型推理算力额度 · 充值直享创作者生态分润
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-base font-bold text-slate-900">算力充值成功！</h4>
            <p className="text-xs text-slate-500">
              ￥{selectedPack.price}（{selectedPack.tokensFormatted}）已即时充入您的账户算力池。
            </p>
            {targetAuthorName && (
              <div className="text-[11px] bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200 max-w-xs mx-auto">
                已自动为创作者 <strong>{targetAuthorName}</strong> 结算对应的 Token 充值分润！
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Target Agent Context if provided */}
            {targetAgentTitle && (
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center gap-2.5 text-xs text-amber-950">
                <Bot size={18} className="text-amber-600 shrink-0" />
                <div className="leading-snug">
                  您正在为智能体 <strong className="text-amber-900">「{targetAgentTitle}」</strong> 充值调用算力。
                  {targetAuthorName && (
                    <span className="block text-[11px] text-amber-800 mt-0.5">
                      充值款项的 <strong>15%~20%</strong> 将即时分润给创作者 <strong>{targetAuthorName}</strong>。
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Token Packs Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
                <span>选择算力包规格 (按量充值)</span>
                <span className="text-[11px] text-slate-400 font-normal">Token 额度永久有效不过期</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {tokenPacks.map((pack, idx) => {
                  const isSelected = selectedPackIndex === idx;
                  return (
                    <button
                      key={pack.price}
                      type="button"
                      onClick={() => setSelectedPackIndex(idx)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 text-amber-950 ring-2 ring-amber-400/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/30'
                      }`}
                    >
                      {pack.popular && (
                        <span className="absolute -top-2 -right-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-bold shadow-2xs">
                          爆款推荐
                        </span>
                      )}
                      <div>
                        <div className="text-base font-extrabold text-slate-900">
                          ￥{pack.price}
                        </div>
                        <div className="text-xs font-bold text-amber-700 mt-0.5">
                          {pack.tokensFormatted}
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
                        {pack.callsEstimate}
                        {pack.bonus && (
                          <div className="text-orange-600 font-semibold mt-0.5">{pack.bonus}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">支付方式</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wechat')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === 'wechat'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>🟢 微信安全支付</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('alipay')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === 'alipay'
                      ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>🔵 支付宝快捷支付</span>
                </button>
              </div>
            </div>

            {/* Transparent Creator Sharing Mechanism Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <HeartHandshake size={14} className="text-amber-600" />
                <span>创作者算力分润保障</span>
              </div>
              <p className="leading-relaxed text-slate-500">
                用户按需充值 Token 用于模型推理。您的充值流水将由系统自动核算并<strong>直接分成 15%~20% 给对应智能体的创作者</strong>，支持创作者持续优化模型。
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePay}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <span>立即充值 ￥{selectedPack.price}（获取 {selectedPack.tokensFormatted}）</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
