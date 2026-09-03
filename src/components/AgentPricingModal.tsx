import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CreatorAgentItem } from '../types/creator';
import { AGENT_PRICE_CHANGE_NOTICE } from '../lib/agentLifecycle';
import { api, ApiError } from '../lib/api';
import {
  catalogPriceYuan,
  normalizePricingPlans,
  validatePaidPlans,
  type PreferredPlan
} from '../../shared/pricingPlans';
import { AgentPricingFields } from './AgentPricingFields';

interface AgentPricingModalProps {
  agent: CreatorAgentItem;
  onClose: () => void;
  onSaved: (updated: CreatorAgentItem) => void;
}

export const AgentPricingModal: React.FC<AgentPricingModalProps> = ({ agent, onClose, onSaved }) => {
  const initial = normalizePricingPlans({
    ...agent.pricingPlans,
    isFree: agent.pricingType === 'free' || agent.pricingPlans?.isFree,
    monthlyPrice: agent.pricingPlans?.monthlyPrice || agent.price || 39
  });
  const [pricingModel, setPricingModel] = useState<'paid' | 'free'>(initial.isFree ? 'free' : 'paid');
  const [monthlyPrice, setMonthlyPrice] = useState(initial.monthlyPrice || 39);
  const [annualPrice, setAnnualPrice] = useState(initial.annualPrice || 368);
  const [buyoutPrice, setBuyoutPrice] = useState(initial.buyoutPrice || 599);
  const [preferredPlan, setPreferredPlan] = useState<PreferredPlan>(initial.preferredPlan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [pricingModel, monthlyPrice, annualPrice, buyoutPrice, preferredPlan]);

  const handleSave = async () => {
    const plans = normalizePricingPlans({
      isFree: pricingModel === 'free',
      monthlyPrice,
      annualPrice,
      buyoutPrice,
      preferredPlan
    });
    const invalid = validatePaidPlans(plans);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    try {
      await api(`/api/me/agents/${agent.id}/pricing`, {
        method: 'PUT',
        body: JSON.stringify(plans)
      });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      const code = err instanceof ApiError ? err.code : '';
      if (status !== 401 && status !== 403 && status !== 404 && code !== 'NETWORK_ERROR') {
        setError(err instanceof Error ? err.message : '定价更新失败');
        setSaving(false);
        return;
      }
    }
    onSaved({
      ...agent,
      pricingType: plans.isFree ? 'free' : 'paid',
      price: catalogPriceYuan(plans),
      pricingPlans: plans,
      updatedAt: '刚刚'
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-2 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">调整定价</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{agent.title}</p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <AgentPricingFields
            pricingModel={pricingModel}
            monthlyPrice={monthlyPrice}
            annualPrice={annualPrice}
            buyoutPrice={buyoutPrice}
            preferredPlan={preferredPlan}
            onPricingModelChange={setPricingModel}
            onMonthlyPriceChange={setMonthlyPrice}
            onAnnualPriceChange={setAnnualPrice}
            onBuyoutPriceChange={setBuyoutPrice}
            onPreferredPlanChange={setPreferredPlan}
          />
          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            {AGENT_PRICE_CHANGE_NOTICE}
          </p>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存定价'}
          </button>
        </div>
      </div>
    </div>
  );
};
