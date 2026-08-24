import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ScanFace,
  AlertCircle
} from 'lucide-react';
import { CreatorTierLevel, AI_EXPERT_DISCLAIMER } from '../types/creator';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';

interface CreatorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: CreatorTierLevel;
  /** @deprecated 申请改为提交后台审核，不再即时开通 */
  onCompleteUpgrade?: (targetTier: CreatorTierLevel, profileData?: any) => void;
  onApplicationSubmitted?: (info: {
    type: 'onboarding';
    targetLevel: number;
    applicantName: string;
    applicationId?: string;
  }) => void;
}

export const CreatorOnboardingModal: React.FC<CreatorOnboardingModalProps> = ({
  isOpen,
  onClose,
  onApplicationSubmitted
}) => {
  // Step flow:
  // 1: 规则说明
  // 2: 阅读并同意 AI 专家入驻协议
  // 3: 实名认证（后端核验）
  // 4: 创建专家主页并提交运营审核
  const [step, setStep] = useState<number>(1);

  // Agreement state
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);

  // Real-name form
  const [realName, setRealName] = useState('周启航');
  const [idCardNumber, setIdCardNumber] = useState('440301199408123456');
  const [phone, setPhone] = useState('13900001111');

  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [faceScanSuccess, setFaceScanSuccess] = useState(false);
  const [realNameError, setRealNameError] = useState('');
  const [realNameMasked, setRealNameMasked] = useState('');

  // Expert profile creation
  const [expertName, setExpertName] = useState('周启航');
  const [expertTitle, setExpertTitle] = useState('本地生活 AI 运营专家');
  const [expertBio, setExpertBio] = useState('做过门店私域与团购客服自动化，希望入驻平台发布可运行作品。');
  const [domainTags, setDomainTags] = useState('本地生活, 电商零售');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAppId, setSubmittedAppId] = useState('');

  if (!isOpen) return null;

  const handleStartAliyunVerify = async () => {
    setIsFaceScanning(true);
    setRealNameError('');
    try {
      await ensureMarketplaceSession();
      const result = await api<{
        status: string;
        realNameMasked?: string;
        failReason?: string;
      }>('/api/me/real-name-verification', {
        method: 'POST',
        body: JSON.stringify({ realName, idCardNumber })
      });
      if (result.status !== 'verified') {
        setRealNameError(result.failReason || '实名核验未通过');
        setFaceScanSuccess(false);
        return;
      }
      setRealNameMasked(result.realNameMasked || '');
      setFaceScanSuccess(true);
    } catch (err) {
      setRealNameError(err instanceof Error ? err.message : '实名核验失败');
      setFaceScanSuccess(false);
    } finally {
      setIsFaceScanning(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!agreedTerms || !agreedPrivacy || !agreedDisclaimer) return;
      setStep(3);
    } else if (step === 3) {
      if (!faceScanSuccess) return;
      setStep(4);
    } else if (step === 4) {
      if (!expertName || !expertTitle) return;
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await ensureMarketplaceSession();
      const app = await api<{ id: string }>('/api/me/expert-applications', {
        method: 'POST',
        body: JSON.stringify({
          type: 'onboarding',
          applicantName: expertName,
          contactPhone: phone,
          expertTitle,
          bio: expertBio,
          domainTags: domainTags.split(',').map((s) => s.trim()).filter(Boolean),
          agreementAccepted: true,
          agreementVersion: 'v1'
        })
      });
      setSubmittedAppId(app.id);
      setIsDone(true);
      onApplicationSubmitted?.({
        type: 'onboarding',
        targetLevel: 1,
        applicantName: expertName,
        applicationId: app.id
      });
      setTimeout(() => {
        onClose();
        setIsDone(false);
        setStep(1);
      }, 2600);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失败，请确认后台已启动');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="creator-onboarding-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">申请成为 AI 专家 · 认证入驻流程</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold border border-blue-400/30">
                  官方两类主体标准
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                实名核验 → 创建专家主页 → 提交运营审核 → 审核通过后成为 AI 专家
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 overflow-x-auto">
          {[
            { s: 1, label: '1. 规则说明' },
            { s: 2, label: '2. 专家协议' },
            { s: 3, label: '3. 阿里云实名' },
            { s: 4, label: '4. 专家主页与提交' }
          ].map((item) => (
            <div
              key={item.s}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-lg transition-all ${
                step === item.s
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : step > item.s
                  ? 'text-emerald-700 bg-emerald-100/70 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto max-h-[70vh]">
          {isDone ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">申请已提交，等待运营审核</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                资料已进入后台审核队列。运营通过后，您将成为 AI 专家并出现在专家库；驳回时会说明原因，可修改后再次提交。
              </p>
              {submittedAppId && (
                <p className="text-[11px] font-mono text-slate-500">申请编号：{submittedAppId}</p>
              )}
            </div>
          ) : (
            <>
              {/* STEP 1: 规则说明 */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900">
                      AI 专家认证体系与身份说明
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      平台仅区分两类主体：普通用户与 AI 专家。专家身份由入驻审核产生，可因违规冻结。
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 space-y-1">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5">
                        <Award size={14} className="text-blue-600" />
                        <span>入驻成为 AI 专家需完成的硬性条件：</span>
                      </div>
                      <p className="text-slate-600 text-[11.5px] leading-relaxed">
                        必须完成公安真人实名认证，完善专家主页资料，并提交运营审核；审核通过后获得一级 AI 专家身份。发布可运行作品可在入驻后于专家中心继续完成。
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-amber-600" />
                        <span>认证与审核规则：</span>
                      </div>
                      <p className="text-slate-700 text-[11.5px] leading-relaxed">
                        普通用户提交入驻申请，审核通过后成为 AI 专家。专家身份只能由审核产生；平台可因违规冻结认证。本期不展示分成或返点说明。
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="font-bold text-slate-800 block">AI 专家</span>
                      <span className="text-[10.5px] text-blue-600 mt-0.5 block">实名 + 资料完整 + 运营审核</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: 专家协议 */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-base font-bold text-slate-900">阅读并签署 AI 专家入驻协议</h3>
                    <p className="text-xs text-slate-500 mt-0.5">请仔细阅读以下平台规则与免责声明</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 h-48 overflow-y-auto text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p className="font-bold text-slate-800">一、实名与作品发布义务</p>
                    <p>AI 专家必须提供真实合法身份信息，并承诺上传的 Skill 及智能体不包含任何恶意代码、木马或侵犯第三方知识产权的内容。</p>
                    <p className="font-bold text-slate-800">二、认证与违规处理</p>
                    <p>专家身份仅由审核通过产生；平台可因违规冻结认证。冻结后保留资料，但不进入专家库、不可接收新咨询。</p>
                    <p className="font-bold text-slate-800">三、平台免责与服务边界</p>
                    <p>{AI_EXPERT_DISCLAIMER}</p>
                  </div>

                  <div className="space-y-2 pt-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>我已阅读并同意《Hellome AI 专家入驻协议》</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedPrivacy}
                        onChange={(e) => setAgreedPrivacy(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>我已阅读并同意《创作者个人信息保护与公安身份核验授权》</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedDisclaimer}
                        onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-800">知悉并认同平台官方免责声明（认证不作为线下交付连带担保）</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: 阿里云公安实名认证与人脸识别 */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-base font-bold text-slate-900">实名认证（后端核验）</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      由服务端发起核验并保存结果；前端不能自行声明已认证。开发环境使用模拟适配器。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">真实姓名 *</label>
                      <input
                        type="text"
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">身份证号 *</label>
                      <input
                        type="text"
                        value={idCardNumber}
                        onChange={(e) => setIdCardNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <ScanFace size={24} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">身份二要素核验</div>
                        <div className="text-[11px] text-slate-500">
                          {faceScanSuccess
                            ? `✓ 核验通过${realNameMasked ? `（${realNameMasked}）` : ''}`
                            : '提交后由后端返回核验结果'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleStartAliyunVerify}
                      disabled={isFaceScanning || faceScanSuccess}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        faceScanSuccess
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isFaceScanning
                          ? 'bg-blue-300 text-white cursor-wait'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                    >
                      {faceScanSuccess ? '核验已通过' : isFaceScanning ? '核验检测中...' : '发起实名核验'}
                    </button>
                  </div>
                  {realNameError && <p className="text-xs text-rose-600">{realNameError}</p>}
                </div>
              )}

              {/* STEP 4: 创建专家主页 */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-base font-bold text-slate-900">创建公开、可分享的 AI 专家主页</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      填写擅长领域与简介后即可提交，由运营审核通过后开通专家身份
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">对外展示昵称 / 专家名称 *</label>
                      <input
                        type="text"
                        value={expertName}
                        onChange={(e) => setExpertName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">专业头衔 / 核心定位 *</label>
                      <input
                        type="text"
                        value={expertTitle}
                        onChange={(e) => setExpertTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">擅长领域标签 (逗号分隔) *</label>
                      <input
                        type="text"
                        value={domainTags}
                        onChange={(e) => setDomainTags(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">个人履历与智能体交付介绍</label>
                      <textarea
                        rows={3}
                        value={expertBio}
                        onChange={(e) => setExpertBio(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!isDone && (
          <>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  <span>上一步</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNext}
                  disabled={
                    (step === 2 && (!agreedTerms || !agreedPrivacy || !agreedDisclaimer)) ||
                    (step === 3 && !faceScanSuccess) ||
                    (step === 4 && (!expertName || !expertTitle)) ||
                    isSubmitting
                  }
                  className={
                    (step === 2 && (!agreedTerms || !agreedPrivacy || !agreedDisclaimer)) ||
                    (step === 3 && !faceScanSuccess) ||
                    (step === 4 && (!expertName || !expertTitle)) ||
                    isSubmitting
                      ? 'px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
                  }
                >
                  <span>
                    {isSubmitting ? '提交中…' : step === 4 ? '提交申请，等待运营审核' : '下一步'}
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
            {submitError ? (
              <p className="px-6 pb-3 text-xs text-rose-600 font-medium">{submitError}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
