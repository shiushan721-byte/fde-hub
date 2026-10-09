import React from 'react';

type PricingModel = 'paid' | 'free';

interface AgentPricingFieldsProps {
  pricingModel: PricingModel;
  price: number;
  trialDays: number;
  onPricingModelChange: (model: PricingModel) => void;
  onPriceChange: (value: number) => void;
  onTrialDaysChange: (value: number) => void;
  tokenRebateRate?: number;
}

function parsePrice(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseTrialDays(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(90, Math.round(n));
}

export const AgentPricingFields: React.FC<AgentPricingFieldsProps> = ({
  pricingModel,
  price,
  trialDays,
  onPricingModelChange,
  onPriceChange,
  onTrialDaysChange,
  tokenRebateRate = 20
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">计费模式</span>
        <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => onPricingModelChange('paid')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              pricingModel === 'paid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            商业收费
          </button>
          <button
            type="button"
            onClick={() => onPricingModelChange('free')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              pricingModel === 'free'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            免费开放
          </button>
        </div>
      </div>

      {pricingModel === 'paid' ? (
        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">一次性售价</span>
            <span className="text-[10px] text-slate-400">元</span>
          </div>
          <input
            type="number"
            min={1}
            value={price}
            onChange={(e) => onPriceChange(parsePrice(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
          />
          <p className="text-[11px] text-slate-500">购买后可长期使用，不按月或年续费。</p>
        </div>
      ) : null}

      {pricingModel === 'paid' ? (
        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">免费试用天数</span>
            <span className="text-[10px] text-slate-400">0 表示不提供试用</span>
          </div>
          <input
            type="number"
            min={0}
            max={90}
            step={1}
            value={trialDays}
            onChange={(e) => onTrialDaysChange(parseTrialDays(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
          />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {trialDays > 0
              ? `买家看到「免费试用 ${trialDays} 天」。计时从首次成功启动开始，到期后需一次购买。`
              : '填 0 时不提供试用，买家直接购买。'}
            一次付款，长期使用，不按月或年续费。
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          智能体免费开放给用户体验。用户调用消耗 Token 时仍需自充，您享有{' '}
          <strong>{tokenRebateRate}% 算力返点</strong>。
        </p>
      )}
    </div>
  );
};
