import React, { useState, useEffect } from 'react';
import { X, Bot, ArrowRight, ArrowLeft } from 'lucide-react';
import { FDEExpert, AgentSolution, ConsultationFormState } from '../types';
import { getStandardVersionForAgent } from '../data/agentInstanceMockData';
import { activeCustomProjects, customProjectsTotalYuan } from '../../shared/customProjects';

const OTHER_INTENT = '__other__';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetExpert: FDEExpert | null;
  referenceAgent?: AgentSolution | null;
  availableAgents?: AgentSolution[];
  initialPrompt?: string;
  /** 打开时预选的定制项目 */
  initialProjectIds?: string[];
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
  initialProjectIds = [],
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
  const [intentId, setIntentId] = useState('');
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
    const validIds = activeCustomProjects(referenceAgent?.customProjects || []).map((item) => item.id);
    const preset = (initialProjectIds || []).find((id) => validIds.includes(id));
    setIntentId(preset || '');
    setContactName(defaultContactName || '');
    setContactCompany('');
    setContactPhone(defaultContactPhone || '');
    setIsSubmitting(false);
  }, [isOpen, referenceAgent, initialPrompt, initialProjectIds, defaultContactName, defaultContactPhone, targetExpert?.id, expertAgents.length]);

  if (!isOpen || !targetExpert) return null;

  const catalogProjects = activeCustomProjects(selectedAgent?.customProjects || []);
  const selectedProjects =
    intentId && intentId !== OTHER_INTENT
      ? catalogProjects.filter((item) => item.id === intentId)
      : [];
  const projectTotal = customProjectsTotalYuan(selectedProjects);
  const canSubmit =
    Boolean(contactName.trim() && contactPhone.trim() && requirement.trim()) &&
    (catalogProjects.length === 0 || Boolean(intentId));

  const handleSelectAgent = (agent: AgentSolution) => {
    setSelectedAgent(agent);
    setIntentId('');
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!requirement.trim() || !contactName.trim() || !contactPhone.trim()) return;
    const intentLabel = selectedProjects[0]
      ? `意向服务：${selectedProjects[0].title}（¥${selectedProjects[0].price} 起）`
      : intentId === OTHER_INTENT
        ? '意向服务：其他定制需求'
        : '';
    const problem = [intentLabel, requirement.trim()].filter(Boolean).join('\n');

    setIsSubmitting(true);
    setTimeout(() => {
      const standardVersion = selectedAgent
        ? getStandardVersionForAgent(selectedAgent.id)
        : undefined;

      const data: ConsultationFormState = {
        expertId: targetExpert.id,
        agentId: selectedAgent?.id,
        businessProblem: problem,
        referenceAgentTitle: selectedAgent?.title,
        standardVersionAtRequest: standardVersion,
        demandScenario: selectedAgent ? 'based_on_existing' : 'fully_independent',
        customizationSpec: selectedAgent
          ? {
              unsatisfiedAreas: problem,
              pagesToModify: [],
              flowsToModify: [],
              additionalInputsOutputs: '',
              needsCustomerData: false,
              needsThirdPartyIntegration: false,
              audienceType: 'enterprise_members',
              selectedProjectIds: selectedProjects.map((item) => item.id),
              selectedProjects: selectedProjects.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                price: item.price,
                priceCents: item.price * 100
              }))
            }
          : undefined,
        expectedTimeline: '',
        serviceTypes: [],
        contactName: contactName.trim(),
        contactCompany: contactCompany.trim(),
        contactPhone: contactPhone.trim(),
        additionalNotes: '',
        priceCents: projectTotal * 100
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
              <h2 className="text-lg font-bold truncate">
                {agentLocked ? '咨询专家定制' : `向 ${targetExpert.name} 发起项目咨询`}
              </h2>
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] text-slate-700 space-y-1">
              <p>
                <span className="text-slate-500">服务专家：</span>
                <span className="font-semibold text-slate-900">
                  {selectedAgent?.authorName || targetExpert.name}
                </span>
              </p>
              {selectedAgent ? (
                <p>
                  <span className="text-slate-500">关联工具：</span>
                  <span className="font-semibold text-slate-900">{selectedAgent.title}</span>
                </p>
              ) : directConsultOnly ? (
                <p className="text-slate-500">暂无可选智能体，直接向专家咨询。</p>
              ) : null}
              {!agentLocked && selectedAgent && hasExpertAgents && (
                <button
                  type="button"
                  onClick={() => setStep('select-agent')}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft size={12} />
                  更换关联工具
                </button>
              )}
            </div>

            {catalogProjects.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-[13px] font-bold text-slate-900">
                  意向服务 <span className="text-rose-500">*</span>
                </legend>
                <div className="space-y-2">
                  {catalogProjects.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                        intentId === item.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="consult-intent"
                        className="mt-0.5"
                        checked={intentId === item.id}
                        onChange={() => setIntentId(item.id)}
                      />
                      <span className="min-w-0 flex-1 text-[13px] text-slate-800">
                        {item.title}（¥{item.price} 起）
                      </span>
                    </label>
                  ))}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                      intentId === OTHER_INTENT ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="consult-intent"
                      className="mt-0.5"
                      checked={intentId === OTHER_INTENT}
                      onChange={() => setIntentId(OTHER_INTENT)}
                    />
                    <span className="text-[13px] text-slate-800">其他定制需求</span>
                  </label>
                </div>
              </fieldset>
            )}

            <div>
              <label className="block text-[13px] font-bold text-slate-900 mb-1.5">
                需求描述 <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="consult-requirement"
                required
                rows={4}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="请描述你的业务场景、定制需求和期望结果"
                className="w-full p-3.5 bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-900 mb-1.5">
                联系人 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="请输入联系人姓名"
                className="w-full px-3 py-2.5 bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-slate-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-900 mb-1.5">
                手机号 <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full px-3 py-2.5 bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-slate-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-900 mb-1.5">企业 / 团队</label>
              <input
                type="text"
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                placeholder="请输入企业或团队名称（选填）"
                className="w-full px-3 py-2.5 bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="pt-1 flex items-center justify-between gap-4">
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
                disabled={isSubmitting || !canSubmit}
                className={`px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all ${
                  isSubmitting ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                }`}
              >
                {isSubmitting ? '正在提交...' : '提交给专家'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
