import React from 'react';
import type { PreferredPlan } from '../../shared/pricingPlans';

type PricingModel = 'paid' | 'free';

interface AgentPricingFieldsProps {
  pricingModel: PricingModel;
  monthlyPrice: number;
  annualPrice: number;
  buyoutPrice: number;
  preferredPlan: PreferredPlan;
  onPricingModelChange: (model: PricingModel) => void;
  onMonthlyPriceChange: (value: number) => void;
  onAnnualPriceChange: (value: number) => void;
  onBuyoutPriceChange: (value: number) => void;
  onPreferredPlanChange: (value: PreferredPlan) => void;
  tokenRebateRate?: number;
}

function parsePrice(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export const AgentPricingFields: React.FC<AgentPricingFieldsProps> = ({
  pricingModel,
  monthlyPrice,
  annualPrice,
  buyoutPrice,
  preferredPlan,
  onPricingModelChange,
  onMonthlyPriceChange,
  onAnnualPriceChange,
  onBuyoutPriceChange,
  onPreferredPlanChange,
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">按月付费</span>
                <span className="text-[10px] text-slate-400">元/月</span>
              </div>
              <input
                type="number"
                min={1}
                value={monthlyPrice}
                onChange={(e) => onMonthlyPriceChange(parsePrice(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
              />
            </div>
            <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900">按年付费</span>
                <span className="text-[10px] text-blue-600 font-semibold">推荐 75 折</span>
              </div>
              <input
                type="number"
                min={1}
                value={annualPrice}
                onChange={(e) => onAnnualPriceChange(parsePrice(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
              />
            </div>
            <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">终身买断</span>
                <span className="text-[10px] text-amber-700 font-semibold">永久授权</span>
              </div>
              <input
                type="number"
                min={1}
                value={buyoutPrice}
                onChange={(e) => onBuyoutPriceChange(parsePrice(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700">推荐套餐</span>
            {(['monthly', 'annual', 'buyout'] as PreferredPlan[]).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => onPreferredPlanChange(plan)}
                className={`px-2 py-1 rounded-md font-bold cursor-pointer ${
                  preferredPlan === plan
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {plan === 'monthly' ? '按月' : plan === 'annual' ? '按年' : '买断'}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-slate-500">
          智能体免费开放给用户体验。用户调用消耗 Token 时仍需自充，您享有{' '}
          <strong>{tokenRebateRate}% 算力返点</strong>。
        </p>
      )}
    </div>
  );
};
