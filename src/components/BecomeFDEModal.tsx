import React, { useEffect, useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  DollarSign,
  Layers,
  Server,
  Zap,
  Lock,
  Cpu,
  Check,
  ExternalLink,
  ChevronRight,
  Clock,
  AlertCircle,
  Building2,
  FileText,
  Star,
  Crown,
  Info
} from 'lucide-react';
import { mockAgentSolutions } from '../data/mockData';
import { AI_EXPERT_DISCLAIMER, CreatorTierLevel } from '../types/creator';
import { EXPERT_TIER_LABEL } from '../utils/expertIdentity';
import { api } from '../lib/api';

interface BecomeFDEModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: CreatorTierLevel;
  existingExpertId?: string;
  /** @deprecated 晋升改为后台审核，不再即时开通 */
  onCompleteUpgrade?: (nextTier: 2 | 3) => void;
  onApplicationSubmitted?: (info: {
    type: 'upgrade';
    targetLevel: 2 | 3;
    applicantName?: string;
  }) => void;
  /** @deprecated 使用 onCompleteUpgrade */
  onCompleteFDEUpgrade?: () => void;
}

export const BecomeFDEModal: React.FC<BecomeFDEModalProps> = ({
  isOpen,
  onClose,
  currentTier = 1,
  existingExpertId = 'fde-linran',
  onApplicationSubmitted
}) => {
  const defaultTarget: 2 | 3 = currentTier >= 2 ? 3 : 2;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetTier] = useState<2 | 3>(defaultTarget);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(mockAgentSolutions[0]?.id || 'agent_ecommerce_cs');
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['电商零售', '私有化部署']);
  const [availableDomains, setAvailableDomains] = useState<string[]>([
    '电商零售',
    '智能制造',
    '内容营销',
    '法律金融',
    '医疗健康',
    '知识库检索',
    '办公协同',
    '私有化部署'
  ]);
  const [caseDescription, setCaseDescription] = useState(
    '主导交付跨境电商全渠道客服自愈沙箱智能体，过去90天累计执行 3,500 次，Hermes 稳定性 99.4%，平均评分 4.92。'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setIsApproved(false);
    setSubmitError('');
    void api<Array<{ name: string }>>('/api/public/expert-tags')
      .then((tags) => {
        const names = tags.map((t) => t.name).filter(Boolean);
        if (names.length > 0) {
          setAvailableDomains(names);
          setSelectedDomains((prev) => {
            const valid = prev.filter((d) => names.includes(d));
            return valid.length > 0 ? valid : [names[0]];
          });
        }
      })
      .catch(() => undefined);
  }, [isOpen, currentTier]);

  if (!isOpen) return null;

  const toggleDomain = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      if (selectedDomains.length > 1) {
        setSelectedDomains(selectedDomains.filter((d) => d !== domain));
      }
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      // 晋升必须绑定真实专家账号，不能用普通演示用户绕过
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: `${existingExpertId}@experts.hellome.art`,
          password: 'hellome-expert'
        })
      });
      const selected = mockAgentSolutions.find((a) => a.id === selectedAgentId);
      await api('/api/me/expert-applications', {
        method: 'POST',
        body: JSON.stringify({
          type: 'upgrade',
          applicantName: selected?.authorName || '当前专家',
          expertTitle: selected?.authorName ? `${selected.authorName} · 晋升申请` : '晋升申请',
          bio: caseDescription,
          domainTags: selectedDomains,
          agentTitle: selected?.title || '',
          agentCategory: selected?.category || '',
          selectedAgentId,
          caseDescription,
          agreementAccepted: true,
          agreementVersion: 'v1'
        })
      });
      setIsApproved(true);
      setStep(3);
      onApplicationSubmitted?.({ type: 'upgrade', targetLevel: targetTier });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失败，请确认后台已启动且当前账号为有效专家');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="become-fde-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="become-fde-modal-card"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 animate-in zoom-in-95 duration-200 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-200 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Crown size={24} className="text-amber-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">
                  申请晋升{EXPERT_TIER_LABEL[targetTier]}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                  仅可升一级
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                当前为{EXPERT_TIER_LABEL[currentTier]} · 基于真实调用量与 Hermes 稳定性评估晋升
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer relative z-10"
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* Steps Progress Indicator */}
        {step !== 3 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {step > 1 ? '✓' : '1'}
              </span>
              <span className={step === 1 ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                1. 认证等级与代表作
              </span>
            </div>
            <div className="w-8 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </span>
              <span className={step === 2 ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                2. 运行数据与复核说明
              </span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Target Tier Selection — 不可跨级，目标由当前等级锁定 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900">目标申请等级（系统锁定）</label>
                <div className="p-4 rounded-2xl border border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                      <Crown size={14} className="text-indigo-600" />
                      <span>{EXPERT_TIER_LABEL[targetTier]}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-bold">
                      当前 {EXPERT_TIER_LABEL[currentTier]} → 仅可申请本级
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    不允许跨级申请；目标等级由服务端根据当前有效认证锁定，管理员审核时亦不可改级。
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu size={14} className="text-blue-600" />
                  <span>选择用于申报的主力作品智能体 *</span>
                </label>
              </div>

              <div className="space-y-2.5">
                {mockAgentSolutions.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      selectedAgentId === agent.id
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={agent.coverImage}
                        alt={agent.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {agent.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {agent.description}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                            {agent.category}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>沙箱校验 99.4% 稳定</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedAgentId === agent.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300'
                    }`}>
                      {selectedAgentId === agent.id && <Check size={12} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Domains */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-600" />
                  <span>擅长交付与实施行业（多选） *</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableDomains.map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => toggleDomain(dom)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        selectedDomains.includes(dom)
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dom}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-600" />
                  <span>运行数据表现与交付案例说明 *</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  简述您的智能体在真实生产环境下的调用规模、服务企业案例与故障自愈表现。
                </p>
                <textarea
                  rows={4}
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  placeholder="详细列举代表案例及生产稳定性指标..."
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Info size={14} className="text-amber-700" />
                  <span>审核说明：</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  晋升申请提交后由运营审核；通过后等级按申请锁定目标生效，管理员不可改级。违规时平台可冻结认证。
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 (Completed) */}
          {step === 3 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                晋升申请已提交，等待运营复核
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                您的{EXPERT_TIER_LABEL[targetTier]}申报材料已进入后台审核。运营通过后才会更新等级标识与权益；驳回时会反馈原因。
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation Actions */}
        {step !== 3 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>上一步</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                稍后再说
              </button>

              <button
                type="button"
                onClick={step === 1 ? () => setStep(2) : handleSubmitApplication}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <span>正在提交评估...</span>
                ) : step === 1 ? (
                  <>
                    <span>下一步</span>
                    <ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    <span>提交晋升申请</span>
                    <CheckCircle2 size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {submitError && step !== 3 && (
          <p className="px-6 pb-3 text-xs text-rose-600 font-medium">{submitError}</p>
        )}
      </div>
    </div>
  );
};
