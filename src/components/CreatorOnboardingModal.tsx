import React, { useRef, useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Upload,
  IdCard
} from 'lucide-react';
import { CreatorTierLevel, AI_EXPERT_DISCLAIMER } from '../types/creator';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';

const REAL_NAME_AGREEMENT = `一、身份信息真实性
您确认所填写的姓名、身份证号码及上传的身份证正反面照片均为本人真实有效证件信息，并授权平台通过合法渠道进行核验。

二、信息用途与保管
身份证影像与证件号码仅用于专家入驻实名审核与合规存档，不会在前台公开页面展示完整证件信息。

三、法律责任
若提供虚假身份信息或盗用他人证件，平台有权拒绝入驻、冻结账号，并依法保留追责权利。`;

interface CreatorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: CreatorTierLevel;
  /** @deprecated 申请改为提交后台审核，不再即时开通 */
  onCompleteUpgrade?: (targetTier: CreatorTierLevel, profileData?: unknown) => void;
  onApplicationSubmitted?: (info: {
    type: 'onboarding';
    targetLevel: number;
    applicantName: string;
    applicationId?: string;
  }) => void;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

export const CreatorOnboardingModal: React.FC<CreatorOnboardingModalProps> = ({
  isOpen,
  onClose,
  onApplicationSubmitted
}) => {
  const [realName, setRealName] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardFrontUrl, setIdCardFrontUrl] = useState('');
  const [idCardBackUrl, setIdCardBackUrl] = useState('');
  const [agreedRealName, setAgreedRealName] = useState(false);
  const [agreedOnboarding, setAgreedOnboarding] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAppId, setSubmittedAppId] = useState('');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const canSubmit =
    realName.trim().length > 0 &&
    /^\d{17}[\dXx]$/.test(idCardNumber.replace(/\s/g, '')) &&
    Boolean(idCardFrontUrl) &&
    Boolean(idCardBackUrl) &&
    agreedRealName &&
    agreedOnboarding &&
    !isSubmitting;

  const onPickImage = async (
    file: File | undefined,
    side: 'front' | 'back'
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError('请上传图片格式的身份证照片');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setSubmitError('单张照片请不超过 4MB');
      return;
    }
    setSubmitError('');
    const dataUrl = await fileToDataUrl(file);
    if (side === 'front') setIdCardFrontUrl(dataUrl);
    else setIdCardBackUrl(dataUrl);
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setIsDone(false);
      setSubmitError('');
      setSubmittedAppId('');
    }, 200);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await ensureMarketplaceSession();
      const idCard = idCardNumber.replace(/\s/g, '');

      await api('/api/me/real-name-verification', {
        method: 'POST',
        body: JSON.stringify({
          realName: realName.trim(),
          idCardNumber: idCard,
          idCardFrontUrl,
          idCardBackUrl
        })
      });

      const app = await api<{ id: string }>('/api/me/expert-applications', {
        method: 'POST',
        body: JSON.stringify({
          type: 'onboarding',
          applicantName: realName.trim(),
          expertTitle: '',
          bio: '',
          domainTags: [],
          agreementAccepted: true,
          agreementVersion: 'v1'
        })
      });

      setSubmittedAppId(app.id);
      setIsDone(true);
      onApplicationSubmitted?.({
        type: 'onboarding',
        targetLevel: 1,
        applicantName: realName.trim(),
        applicationId: app.id
      });
      setTimeout(resetAndClose, 2200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PhotoSlot = ({
    label,
    url,
    inputRef,
    onChange
  }: {
    label: string;
    url: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (file?: File) => void;
  }) => (
    <div className="space-y-1.5">
      <div className="text-xs font-bold text-slate-700">{label} *</div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full aspect-[1.58/1] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 transition-colors cursor-pointer overflow-hidden relative"
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Upload size={22} />
            <span className="text-xs font-semibold">点击上传</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </div>
  );

  return (
    <div
      id="creator-onboarding-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center font-black shadow-md">
              <IdCard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                申请成为 AI 应用专家
                <Sparkles size={16} className="text-emerald-300" />
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                填写实名信息并上传身份证正反面，提交后进入运营审核
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[75vh]">
          {isDone ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">申请已提交，等待运营审核</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                实名资料已进入后台审核队列。运营通过后，您将成为 AI 专家并出现在专家库。
              </p>
              {submittedAppId && (
                <p className="text-[11px] font-mono text-slate-500">申请编号：{submittedAppId}</p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">真实姓名 *</label>
                  <input
                    type="text"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    placeholder="与身份证一致"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">身份证号 *</label>
                  <input
                    type="text"
                    value={idCardNumber}
                    onChange={(e) => setIdCardNumber(e.target.value)}
                    placeholder="18 位居民身份证号"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PhotoSlot
                  label="身份证正面（人像面）"
                  url={idCardFrontUrl}
                  inputRef={frontInputRef}
                  onChange={(file) => void onPickImage(file, 'front')}
                />
                <PhotoSlot
                  label="身份证反面（国徽面）"
                  url={idCardBackUrl}
                  inputRef={backInputRef}
                  onChange={(file) => void onPickImage(file, 'back')}
                />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-28 overflow-y-auto text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                  {REAL_NAME_AGREEMENT}
                </div>
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={agreedRealName}
                    onChange={(e) => setAgreedRealName(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600"
                  />
                  <span>我已阅读并同意《身份证实名认证协议》</span>
                </label>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-28 overflow-y-auto text-[11px] text-slate-600 leading-relaxed space-y-1.5">
                  <p className="font-bold text-slate-800">Hellome AI 专家入驻协议（摘要）</p>
                  <p>AI 专家须提供真实合法身份信息，承诺发布内容不侵犯第三方权益。</p>
                  <p>专家身份仅由运营审核通过产生；平台可因违规冻结认证。</p>
                  <p>{AI_EXPERT_DISCLAIMER}</p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={agreedOnboarding}
                    onChange={(e) => setAgreedOnboarding(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600"
                  />
                  <span>我已阅读并同意《Hellome AI 专家入驻协议》</span>
                </label>
              </div>

              {submitError && (
                <p className="text-xs text-rose-600 font-medium">{submitError}</p>
              )}
            </div>
          )}
        </div>

        {!isDone && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className={
                canSubmit
                  ? 'px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95'
                  : 'px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            >
              {isSubmitting ? '提交中…' : '提交审核'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
