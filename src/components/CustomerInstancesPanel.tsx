import React, { useState } from 'react';
import {
  Bot,
  Layers,
  RefreshCw
} from 'lucide-react';
import { CustomerAgentInstance, CustomerLeadItem } from '../types/creator';

interface CustomerInstancesPanelProps {
  instances: CustomerAgentInstance[];
  leads: CustomerLeadItem[];
  onCreateFromLead?: (lead: CustomerLeadItem) => void;
  onUpdateSkill?: (instance: CustomerAgentInstance) => void;
}

const statusLabel: Record<CustomerAgentInstance['status'], string> = {
  draft: '草稿',
  hermes_validating: 'Hermes 校验中',
  active: '已交付运行',
  suspended: '已暂停'
};

const statusColor: Record<CustomerAgentInstance['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  hermes_validating: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-rose-100 text-rose-700'
};

export const CustomerInstancesPanel: React.FC<CustomerInstancesPanelProps> = ({
  instances,
  onUpdateSkill
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(instances[0]?.id || null);
  const selected = instances.find((i) => i.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">客户专属实例管理 ({instances.length})</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {instances.map((inst) => (
            <div
              key={inst.id}
              onClick={() => setSelectedId(inst.id)}
              className={`p-5 bg-white rounded-3xl border cursor-pointer transition-all space-y-3 ${
                selectedId === inst.id
                  ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Bot size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{inst.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      基于 <strong className="text-blue-700">{inst.baseAgentTitle}</strong> · {inst.basedOnStandardVersion}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${statusColor[inst.status]}`}>
                  {statusLabel[inst.status]}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
                <span className="px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
                  客户：{inst.customerCompany}
                </span>
                <span className="px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
                  Skill：{inst.boundSkillVersion}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {selected ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-24">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
                专属实例详情
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  ['实例 ID', selected.id],
                  ['基础智能体', selected.baseAgentTitle],
                  ['基于标准版', selected.basedOnStandardVersion],
                  ['当前通用最新版', selected.latestStandardVersionAvailable || '—'],
                  ['创建 FDE', selected.createdByFdeName],
                  ['目标客户', `${selected.customerName} · ${selected.customerCompany}`],
                  ['绑定 Skill', selected.boundSkillVersion]
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-slate-50 gap-2">
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="font-bold text-slate-800 text-right">{value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Layers size={12} /> 定制改造项
                </span>
                <ul className="text-[11px] text-slate-600 space-y-1">
                  {selected.customizations.pagesModified.length > 0 && (
                    <li>页面：{selected.customizations.pagesModified.join('、')}</li>
                  )}
                  {selected.customizations.flowsModified.length > 0 && (
                    <li>流程：{selected.customizations.flowsModified.join('、')}</li>
                  )}
                  {selected.customizations.dataSources.length > 0 && (
                    <li>数据源：{selected.customizations.dataSources.join('、')}</li>
                  )}
                  {selected.customizations.integrations.length > 0 && (
                    <li>集成：{selected.customizations.integrations.join('、')}</li>
                  )}
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onUpdateSkill?.(selected)}
                  className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1 transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>更新 Skill 包</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
              选择左侧实例查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
