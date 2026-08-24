import React from 'react';
import { Bot, GitBranch, Play, AlertTriangle, ArrowRight } from 'lucide-react';
import { CustomerAgentInstance } from '../types/creator';

interface MyExclusiveAgentsSectionProps {
  instances: CustomerAgentInstance[];
  onRunInstance?: (instance: CustomerAgentInstance) => void;
}

export const MyExclusiveAgentsSection: React.FC<MyExclusiveAgentsSectionProps> = ({
  instances,
  onRunInstance
}) => {
  if (instances.length === 0) return null;

  return (
    <section id="my-exclusive-agents" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {instances.map((inst) => (
          <div
            key={inst.id}
            className="p-5 bg-white rounded-2xl border border-indigo-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{inst.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <GitBranch size={11} />
                    基于 {inst.baseAgentTitle} {inst.basedOnStandardVersion}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                专属实例
              </span>
            </div>

            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              由 <strong>{inst.createdByFdeName}</strong> 定制交付 · Skill {inst.boundSkillVersion}
            </div>

            {inst.upgradeReminder && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 flex items-start gap-1">
                <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                <span>通用版已有更新（{inst.upgradeReminder.latestStandardVersion}），您的专属版独立运行未自动升级</span>
              </div>
            )}

            <button
              onClick={() => onRunInstance?.(inst)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Play size={13} className="fill-white" />
              <span>进入专属运行页</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
