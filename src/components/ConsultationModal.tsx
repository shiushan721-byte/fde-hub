import React, { useState, useEffect } from 'react';
import { X, Bot, ArrowRight, ArrowLeft } from 'lucide-react';
import { FDEExpert, AgentSolution, ConsultationFormState } from '../types';
import { getStandardVersionForAgent } from '../data/agentInstanceMockData';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetExpert: FDEExpert | null;
  referenceAgent?: AgentSolution | null;
  availableAgents?: AgentSolution[];
  initialPrompt?: string;
  /** 登录用户姓名，打开时预填联系人 */
  defaultContactName?: string;
  /** 登录用户手机号，打开时预填且可修改 */
  defaultContactPhone?: string;
  onSubmitSuccess: (consultationData: ConsultationFormState, expert: FDEExpert) => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  onClose,
  targetExpert,
  referenceAgent,
  availableAgents = [],
  initialPrompt = '',
  defaultContactName = '',
  defaultContactPhone = '',
  onSubmitSuccess
}) => {
  const agentLocked = Boolean(referenceAgent);
  const expertAgents = availableAgents.filter(
    (a) => targetExpert && a.authorId === targetExpert.id
  );
  const hasExpertAgents = expertAgents.length > 0;
  const directConsultOnly = !agentLocked && !hasExpertAgents;

  const [step, setStep] = useState<'select-agent' | 'form'>(agentLocked ? 'form' : 'select-agent');
  const [selectedAgent, setSelectedAgent] = useState<AgentSolution | null>(referenceAgent || null);
  const [requirement, setRequirement] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (referenceAgent) {
      setSelectedAgent(referenceAgent);
      setStep('form');
    } else if (expertAgents.length === 0) {
      setSelectedAgent(null);
      setStep('form');
    } else {
      setSelectedAgent(null);
      setStep('select-agent');
    }

    setRequirement(initialPrompt || '');
    setContactName(defaultContactName || '');
    setContactCompany('');
    setContactPhone(defaultContactPhone || '');
    setIsSubmitting(false);
  }, [isOpen, referenceAgent, initialPrompt, defaultContactName, defaultContactPhone, targetExpert?.id, expertAgents.length]);

  if (!isOpen || !targetExpert) return null;

  const handleSelectAgent = (agent: AgentSolution) => {
    setSelectedAgent(agent);
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim()) return;
    if (!contactName.trim() || !contactPhone.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const standardVersion = selectedAgent
        ? getStandardVersionForAgent(selectedAgent.id)
        : undefined;

      const data: ConsultationFormState = {
        expertId: targetExpert.id,
        agentId: selectedAgent?.id,
        businessProblem: requirement.trim(),
        referenceAgentTitle: selectedAgent?.title,
        standardVersionAtRequest: standardVersion,
        demandScenario: selectedAgent ? 'based_on_existing' : 'fully_independent',
        customizationSpec: selectedAgent
          ? {
              unsatisfiedAreas: requirement.trim(),
              pagesToModify: [],
              flowsToModify: [],
              additionalInputsOutputs: '',
              needsCustomerData: false,
              needsThirdPartyIntegration: false,
              audienceType: 'enterprise_members'
            }
          : undefined,
        expectedTimeline: '',
        serviceTypes: [],
        contactName: contactName.trim(),
        contactCompany: contactCompany.trim(),
        contactPhone: contactPhone.trim(),
        additionalNotes: ''
      };
      setIsSubmitting(false);
      onSubmitSuccess(data, targetExpert);
    }, 400);
  };

  return (
    <div
      id="consultation-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="consultation-modal-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={targetExpert.avatar}
                alt={targetExpert.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/20"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">向 {targetExpert.name} 发起项目咨询</h2>
            </div>
          </div>

          <button
            id="btn-close-consult-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {!agentLocked && step === 'select-agent' && hasExpertAgents && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bot size={16} className="text-blue-600" />
                请先选择要咨询的智能体
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                咨询将关联到所选智能体，便于专家针对性回复
              </p>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {expertAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  id={`btn-select-consult-agent-${agent.id}`}
                  onClick={() => handleSelectAgent(agent)}
                  className="w-full p-3.5 bg-white hover:bg-blue-50/60 rounded-2xl border border-slate-200 hover:border-blue-400 text-left transition-all cursor-pointer flex items-center gap-3.5 group"
                >
                  <img
                    src={agent.coverImage}
                    alt={agent.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 truncate">
                      {agent.title}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {agent.subtitle}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-300 group-hover:text-blue-600 shrink-0 transition-colors"
                  />
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {(agentLocked || step === 'form') && (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {selectedAgent ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedAgent.coverImage}
                    alt={selectedAgent.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">咨询智能体</span>
                    <p className="text-xs font-bold text-slate-900 truncate">{selectedAgent.title}</p>
                  </div>
                </div>
                {!agentLocked && hasExpertAgents && (
                  <button
                    type="button"
                    onClick={() => setStep('select-agent')}
                    className="text-xs text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-300 bg-white cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <ArrowLeft size={12} />
                    更换
                  </button>
                )}
              </div>
            ) : directConsultOnly ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600 leading-relaxed">
                暂无可选智能体，直接向专家咨询。
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                填写需求
              </label>
              <textarea
                id="consult-requirement"
                required
                rows={5}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="请描述你的定制需求、业务场景或希望专家协助的内容…"
                className="w-full p-3.5 bg-slate-50 hover:bg-white focus:bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                联系人信息
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">联系人姓名</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="您的称呼"
                    className="w-full px-3 py-2 bg-white text-xs text-slate-900 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">手机号</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="便于专家与您联系"
                    className="w-full px-3 py-2 bg-white text-xs text-slate-900 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">企业 / 团队（选填）</label>
                  <input
                    type="text"
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder="所属公司或团队名称"
                    className="w-full px-3 py-2 bg-white text-xs text-slate-900 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">提交后专家将尽快与您联系</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  id="btn-submit-consultation"
                  type="submit"
                  disabled={isSubmitting || !requirement.trim() || !contactName.trim() || !contactPhone.trim()}
                  className={`px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md transition-all ${
                    isSubmitting ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                  }`}
                >
                  {isSubmitting ? '正在提交...' : '提交咨询'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
