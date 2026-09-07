import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  newCustomProjectId,
  type AgentCustomProject
} from '../../shared/customProjects';

interface AgentCustomProjectsFieldsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  projects: AgentCustomProject[];
  onChange: (projects: AgentCustomProject[]) => void;
}

function parsePrice(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export const AgentCustomProjectsFields: React.FC<AgentCustomProjectsFieldsProps> = ({
  enabled,
  onEnabledChange,
  projects,
  onChange
}) => {
  const update = (index: number, patch: Partial<AgentCustomProject>) => {
    onChange(projects.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50/70">
        <div>
          <div className="text-xs font-bold text-indigo-950">承接 FDE 定制项目</div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            用户选择标准项目后仍走咨询与资金托管；价格由你维护。
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </div>

      {enabled && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">
            把可重复售卖的定制服务拆成标准项目，例如流程修改、界面调整、同步到飞书。
          </p>
          {projects.map((item, index) => (
            <div key={item.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-start gap-2">
                <input
                  value={item.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  placeholder="项目名称，如 流程修改、界面调整"
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => onChange(projects.filter((_, i) => i !== index))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                rows={2}
                value={item.description}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder="服务范围说明（选填）"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none resize-none"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">售价</span>
                  <input
                    type="number"
                    min={1}
                    value={item.price}
                    onChange={(e) => update(index, { price: parsePrice(e.target.value) })}
                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                  />
                  <span className="text-[10px] text-slate-400">元</span>
                </label>
                <label className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(e) => update(index, { active: e.target.checked })}
                  />
                  对用户可见
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange([
                ...projects,
                {
                  id: newCustomProjectId(),
                  title: '',
                  description: '',
                  price: 200,
                  active: true,
                  sortOrder: projects.length
                }
              ])
            }
            className="w-full h-9 rounded-xl border border-dashed border-slate-300 text-slate-700 text-xs font-bold hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            添加标准项目
          </button>
        </div>
      )}
    </div>
  );
};
