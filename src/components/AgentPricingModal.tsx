import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CreatorAgentItem } from '../types/creator';
import { AGENT_PRICE_CHANGE_NOTICE } from '../lib/agentLifecycle';
import { api, ApiError } from '../lib/api';
import { catalogPriceYuan, normalizePricingPlans, pricingFromAgent, validatePaidPlans } from '../../shared/pricingPlans';
import {
  adapterPackageIsFree,
  adapterPackagePriceYuan,
  normalizeAdapterPackages,
  validateAdapterPackagePricing,
  type AgentAdapterPackage
} from '../../shared/adapterPackages';
import { normalizeCustomProjects, validateCustomProjects, type AgentCustomProject } from '../../shared/customProjects';
import { AgentPricingFields } from './AgentPricingFields';
import { AgentCustomProjectsFields } from './AgentCustomProjectsFields';

interface AgentPricingModalProps {
  agent: CreatorAgentItem;
  onClose: () => void;
  onSaved: (updated: CreatorAgentItem) => void;
}

type PricingTab = 'usage' | 'custom' | 'adapter';

export const AgentPricingModal: React.FC<AgentPricingModalProps> = ({ agent, onClose, onSaved }) => {
  const initial = pricingFromAgent({
    price: agent.price,
    pricingPlans: {
      ...agent.pricingPlans,
      isFree: agent.pricingType === 'free' || agent.pricingPlans?.isFree
    }
  });
  const [tab, setTab] = useState<PricingTab>('usage');
  const [pricingModel, setPricingModel] = useState<'paid' | 'free'>(initial.isFree ? 'free' : 'paid');
  const [price, setPrice] = useState(initial.price || 39);
  const [customEnabled, setCustomEnabled] = useState(agent.fdeCustomEnabled !== false);
  const [projects, setProjects] = useState<AgentCustomProject[]>(
    normalizeCustomProjects(agent.customProjects || [])
  );
  const [adapterPackages, setAdapterPackages] = useState<AgentAdapterPackage[]>(
    normalizeAdapterPackages(agent.adapterPackages || [])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [tab, pricingModel, price, customEnabled, projects, adapterPackages]);

  const updateAdapter = (id: string, patch: Partial<AgentAdapterPackage>) => {
    setAdapterPackages((prev) => prev.map((pack) => (pack.id === id ? { ...pack, ...patch } : pack)));
  };

  const handleSave = async () => {
    const plans = normalizePricingPlans({
      isFree: pricingModel === 'free',
      price
    });
    const invalidPlans = validatePaidPlans(plans);
    if (invalidPlans) {
      setTab('usage');
      setError(invalidPlans);
      return;
    }
    const invalidProjects = customEnabled ? validateCustomProjects(projects) : null;
    if (invalidProjects) {
      setTab('custom');
      setError(invalidProjects);
      return;
    }
    const normalizedProjects = normalizeCustomProjects(projects);
    for (const pack of adapterPackages) {
      const invalidPack = validateAdapterPackagePricing(pack);
      if (invalidPack) {
        setTab('adapter');
        setError(invalidPack);
        return;
      }
    }

    setSaving(true);
    try {
      await api(`/api/me/agents/${agent.id}/pricing`, {
        method: 'PUT',
        body: JSON.stringify(plans)
      });
      await api(`/api/me/agents/${agent.id}/custom-projects`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: customEnabled, projects: normalizedProjects })
      });
      if (adapterPackages.length) {
        await api(`/api/me/agents/${agent.id}/adapter-packages`, {
          method: 'PUT',
          body: JSON.stringify({ packages: adapterPackages })
        });
      }
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
      fdeCustomEnabled: customEnabled,
      customProjects: normalizedProjects,
      adapterPackages,
      updatedAt: '刚刚'
    });
    setSaving(false);
  };

  const tabs: Array<{ id: PricingTab; label: string }> = [
    { id: 'usage', label: '智能体使用权' },
    { id: 'custom', label: '定制项目' },
    { id: 'adapter', label: 'Skill 下载' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-2 flex items-start justify-between gap-3 shrink-0">
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
        <div className="px-6 pt-2 flex gap-1 bg-white shrink-0">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                tab === item.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          {tab === 'usage' && (
            <>
              <AgentPricingFields
                pricingModel={pricingModel}
                price={price}
                onPricingModelChange={setPricingModel}
                onPriceChange={setPrice}
              />
              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                {AGENT_PRICE_CHANGE_NOTICE} 此处只管理智能体使用/生成内容的一次性售价。
              </p>
            </>
          )}
          {tab === 'custom' && (
            <AgentCustomProjectsFields
              enabled={customEnabled}
              onEnabledChange={setCustomEnabled}
              projects={projects}
              onChange={setProjects}
            />
          )}
          {tab === 'adapter' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                外部工具 ZIP / Skill 包单独标价。免费则任意下载；收费则购买后才能下载。
              </p>
              {adapterPackages.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-4 text-center">
                  还没有适配包。请先在发布向导上传 ZIP，再回来设置免费或收费。
                </p>
              ) : (
                adapterPackages.map((pack) => {
                  const free = adapterPackageIsFree(pack);
                  return (
                    <div key={pack.id} className="p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-slate-800">{pack.platformName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{pack.fileName}</div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[11px]">
                          <button
                            type="button"
                            onClick={() => updateAdapter(pack.id, { isFree: true, price: 0 })}
                            className={`px-2 py-1 rounded-md font-bold cursor-pointer ${
                              free ? 'bg-white text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            免费
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateAdapter(pack.id, {
                                isFree: false,
                                price: adapterPackagePriceYuan(pack) || 29
                              })
                            }
                            className={`px-2 py-1 rounded-md font-bold cursor-pointer ${
                              !free ? 'bg-white text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            收费
                          </button>
                        </div>
                        {!free && (
                          <label className="flex items-center gap-1 text-[11px] text-slate-600">
                            <input
                              type="number"
                              min={1}
                              value={adapterPackagePriceYuan(pack) || ''}
                              onChange={(e) =>
                                updateAdapter(pack.id, {
                                  isFree: false,
                                  price: Number(e.target.value) || 0
                                })
                              }
                              className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold outline-none"
                            />
                            元
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex items-center justify-end gap-3 shrink-0">
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
