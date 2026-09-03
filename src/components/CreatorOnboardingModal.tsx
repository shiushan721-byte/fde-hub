import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  Camera,
  ChevronLeft,
  Plus
} from 'lucide-react';
import { CreatorTierLevel } from '../types/creator';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import onboardingHero from '../assets/onboarding-hero.png';

const ID_FRONT_PLACEHOLDER = '/demo/id-card-front.svg';
const ID_BACK_PLACEHOLDER = '/demo/id-card-back.svg';
const NICKNAME_MAX = 15;
const BIO_MAX = 200;
const TAG_MAX = 3;

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
  const [step, setStep] = useState<1 | 2>(1);
  const [realName, setRealName] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardFrontUrl, setIdCardFrontUrl] = useState('');
  const [idCardBackUrl, setIdCardBackUrl] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [expertTitle, setExpertTitle] = useState('');
  const [bio, setBio] = useState('');
  const [domainTags, setDomainTags] = useState<string[]>([]);
  const [tagCatalog, setTagCatalog] = useState<string[]>([]);
  const [titleCatalog, setTitleCatalog] = useState<string[]>([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAppId, setSubmittedAppId] = useState('');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSubmitError('');
    void ensureMarketplaceSession().then((user) => {
      if (user.name && !nickname) setNickname(user.name.slice(0, NICKNAME_MAX));
    });
    void api<Array<{ name: string }>>('/api/public/expert-tags')
      .then((tags) => setTagCatalog(tags.map((t) => t.name).filter(Boolean)))
      .catch(() => setTagCatalog([]));
    void api<Array<{ name: string }>>('/api/public/expert-titles')
      .then((titles) => {
        const names = titles.map((t) => t.name).filter(Boolean);
        setTitleCatalog(names);
        setExpertTitle((current) => (current && names.includes(current) ? current : names[0] || ''));
      })
      .catch(() => setTitleCatalog([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const canNext =
    realName.trim().length > 0 &&
    /^\d{17}[\dXx]$/.test(idCardNumber.replace(/\s/g, '')) &&
    Boolean(idCardFrontUrl) &&
    Boolean(idCardBackUrl) &&
    !isSubmitting;

  const canSubmit =
    nickname.trim().length > 0 &&
    expertTitle.trim().length > 0 &&
    bio.trim().length > 0 &&
    domainTags.length > 0 &&
    !isSubmitting;

  const unusedTags = tagCatalog.filter((t) => !domainTags.includes(t));

  const onPickImage = async (file: File | undefined, side: 'front' | 'back' | 'avatar') => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)) {
      setSubmitError('请上传图片格式');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setSubmitError('单张照片请不超过 4MB');
      return;
    }
    setSubmitError('');
    const dataUrl = await fileToDataUrl(file);
    if (side === 'front') setIdCardFrontUrl(dataUrl);
    else if (side === 'back') setIdCardBackUrl(dataUrl);
    else setAvatarUrl(dataUrl);
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setIsDone(false);
      setSubmitError('');
      setSubmittedAppId('');
      setStep(1);
      setTagPickerOpen(false);
    }, 200);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await ensureMarketplaceSession();
      const idCard = idCardNumber.replace(/\s/g, '');
      const displayName = nickname.trim();

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
          applicantName: displayName,
          nickname: displayName,
          expertTitle: expertTitle.trim(),
          bio: bio.trim(),
          domainTags,
          avatarUrl,
          agreementAccepted: true,
          agreementVersion: 'v1'
        })
      });

      setSubmittedAppId(app.id);
      setIsDone(true);
      onApplicationSubmitted?.({
        type: 'onboarding',
        targetLevel: 1,
        applicantName: displayName,
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
    hint,
    url,
    placeholder,
    inputRef,
    onChange
  }: {
    label: string;
    hint: string;
    url: string;
    placeholder: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (file?: File) => void;
  }) => (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold text-slate-700">
        <span className="text-rose-500 mr-0.5">*</span>
        {label}
      </div>
      <label
        id={label.includes('人像') ? 'id-card-front-upload' : 'id-card-back-upload'}
        className="block w-full aspect-[1.58/1] rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer overflow-hidden relative"
      >
        <img
          src={url || placeholder}
          alt={label}
          className={`w-full h-full object-cover ${url ? '' : 'opacity-80'}`}
        />
        {!url && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 bg-gradient-to-t from-black/35 to-transparent pointer-events-none">
            <span className="text-[11px] font-semibold text-white drop-shadow">{hint}</span>
          </div>
        )}
        <input
          ref={inputRef}
          id={label.includes('人像') ? 'id-card-front-file' : 'id-card-back-file'}
          type="file"
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => onChange(e.target.files?.[0])}
        />
      </label>
    </div>
  );

  return (
    <div
      id="creator-onboarding-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-[920px] min-h-[620px] max-h-[92vh] bg-white rounded-[28px] shadow-2xl overflow-hidden flex my-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="hidden md:flex w-[42%] relative shrink-0 overflow-hidden">
          <img
            src={onboardingHero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/25" />
          <div className="relative z-10 flex flex-col justify-between p-6 h-full w-full text-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-300 text-slate-950 flex items-center justify-center text-xs font-black">
                H
              </div>
              <span className="text-lg font-black tracking-tight">
                Hell<span className="text-emerald-300">o</span>me
              </span>
            </div>
            <div className="pb-2">
              <h2 className="text-[28px] leading-tight font-black">
                AI Application
                <br />
                <span className="text-fuchsia-400">Expert</span>
              </h2>
              <p className="mt-3 text-[12px] text-fuchsia-100/90 leading-relaxed max-w-[240px]">
                遇见你的未来，也遇见人类的无穷可能
              </p>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          <button
            type="button"
            onClick={resetAndClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer z-10"
          >
            <X size={18} />
          </button>

          {isDone ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">申请已提交，等待运营审核</h3>
              <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                实名资料与专家主页信息已进入后台「专家审核」。运营通过后，您将成为 AI 专家并出现在专家库。
              </p>
              {submittedAppId && (
                <p className="text-[11px] font-mono text-slate-500">申请编号：{submittedAppId}</p>
              )}
            </div>
          ) : step === 1 ? (
            <div className="flex-1 overflow-y-auto px-8 pt-8 pb-6">
              <h2 className="text-lg font-bold text-slate-900 pr-8">申请成为 AI-FDE 专家</h2>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <PhotoSlot
                  label="身份证人像面"
                  hint="点击上传人像面"
                  url={idCardFrontUrl}
                  placeholder={ID_FRONT_PLACEHOLDER}
                  inputRef={frontInputRef}
                  onChange={(file) => void onPickImage(file, 'front')}
                />
                <PhotoSlot
                  label="身份证国徽面"
                  hint="点击上传国徽面"
                  url={idCardBackUrl}
                  placeholder={ID_BACK_PLACEHOLDER}
                  inputRef={backInputRef}
                  onChange={(file) => void onPickImage(file, 'back')}
                />
              </div>

              <label className="block mt-5 text-[11px] font-semibold text-slate-700">
                <span className="text-rose-500 mr-0.5">*</span>
                真实姓名
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="张小王"
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900"
                />
              </label>

              <label className="block mt-4 text-[11px] font-semibold text-slate-700">
                <span className="text-rose-500 mr-0.5">*</span>
                身份证号
                <input
                  type="text"
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value)}
                  placeholder="123456789012345678"
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-slate-900"
                />
              </label>

              <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
                根据国家相关规定，入驻需完成实名核验。身份证影像与证件号码仅用于专家审核与合规存档，加密保管，不会向第三方披露，也不会在前台公开展示完整证件信息。
              </p>

              {submitError && <p className="mt-3 text-xs text-rose-600 font-medium">{submitError}</p>}

              <button
                type="button"
                disabled={!canNext}
                onClick={() => {
                  if (!canNext) return;
                  setSubmitError('');
                  setStep(2);
                }}
                className={
                  canNext
                    ? 'mt-5 w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold cursor-pointer hover:bg-slate-800'
                    : 'mt-5 w-full py-3 rounded-xl bg-slate-200 text-slate-400 text-sm font-bold cursor-not-allowed'
                }
              >
                下一步
              </button>
              <p className="mt-3 text-[10px] text-slate-400 text-center leading-relaxed">
                提交申请即表示同意《Hellome 服务协议》《隐私政策》和《Hellome AI-FDE 专家入驻协议》
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-8 pt-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setSubmitError('');
                  setStep(1);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <ChevronLeft size={14} />
                上一步
              </button>

              <div className="mt-4 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl font-black">
                      {(nickname.trim()[0] || 'H').toUpperCase()}
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 py-1 bg-black/55 text-white text-[9px] font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    更换
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md">
                    <Camera size={12} />
                  </span>
                </button>
                <p className="mt-2 text-[11px] text-slate-400">点击上传头像</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
        className="sr-only"
                  onChange={(e) => void onPickImage(e.target.files?.[0], 'avatar')}
                />
              </div>

              <label className="block mt-4 text-[11px] font-semibold text-slate-700">
                用户昵称
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    value={nickname}
                    maxLength={NICKNAME_MAX}
                    onChange={(e) => setNickname(e.target.value.slice(0, NICKNAME_MAX))}
                    placeholder="哈啰蜜moleaa"
                    className="w-full px-3 py-2.5 pr-12 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 tabular-nums">
                    {nickname.length}/{NICKNAME_MAX}
                  </span>
                </div>
              </label>

              <label className="block mt-4 text-[11px] font-semibold text-slate-700">
                专家类型
                <select
                  value={expertTitle}
                  onChange={(e) => setExpertTitle(e.target.value)}
                  disabled={titleCatalog.length === 0}
                  className="mt-1.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900 cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {titleCatalog.length === 0 ? (
                    <option value="">暂无上架头衔</option>
                  ) : (
                    titleCatalog.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block mt-4 text-[11px] font-semibold text-slate-700">
                个人简介
                <div className="relative mt-1.5">
                  <textarea
                    value={bio}
                    maxLength={BIO_MAX}
                    onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                    rows={3}
                    placeholder="介绍你的专业背景、交付经验和擅长的智能体场景"
                    className="w-full px-3 py-2.5 pb-6 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900 resize-none leading-relaxed"
                  />
                  <span className="absolute right-3 bottom-2 text-[10px] text-slate-400 tabular-nums">
                    {bio.length}/{BIO_MAX}
                  </span>
                </div>
              </label>

              <div className="mt-4">
                <div className="text-[11px] font-semibold text-slate-700">
                  擅长业务领域
                  <span className="ml-1 font-normal text-slate-400">最多 {TAG_MAX} 个</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {domainTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setDomainTags((prev) => prev.filter((t) => t !== tag))}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {domainTags.length < TAG_MAX ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTagPickerOpen((v) => !v)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-slate-500 text-xs font-medium cursor-pointer hover:border-slate-500"
                      >
                        <Plus size={11} />
                        添加领域
                      </button>
                      {tagPickerOpen && (
                        <div className="absolute left-0 top-full mt-1 z-20 w-52 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1">
                          {unusedTags.length === 0 ? (
                            <p className="px-2 py-2 text-[11px] text-slate-400">暂无可选标签</p>
                          ) : (
                            unusedTags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  setDomainTags((prev) => [...prev, tag].slice(0, TAG_MAX));
                                  setTagPickerOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                {tag}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-50 text-slate-400 text-xs">
                      添加领域（已达上限）
                    </span>
                  )}
                </div>
              </div>

              {submitError && <p className="mt-3 text-xs text-rose-600 font-medium">{submitError}</p>}

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
                className={
                  canSubmit
                    ? 'mt-6 w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold cursor-pointer hover:bg-slate-800'
                    : 'mt-6 w-full py-3 rounded-xl bg-slate-200 text-slate-400 text-sm font-bold cursor-not-allowed'
                }
              >
                {isSubmitting ? '提交中…' : '提交'}
              </button>
              <p className="mt-3 text-[10px] text-slate-400 text-center leading-relaxed">
                提交后将由平台审核，审核通过后您将正式成为 Hellome AI 专家入驻本平台
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
