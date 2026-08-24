import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, Info, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { VerifyType } from '../types';
import { AI_EXPERT_DISCLAIMER, FDECertStatus } from '../types/creator';

interface FDEBadgeProps {
  type?: VerifyType;
  /** @deprecated 平台不再分专家等级 */
  level?: 1 | 2 | 3;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  certStatus?: FDECertStatus;
}

export const FDEBadge: React.FC<FDEBadgeProps> = ({
  type = 'ai_expert',
  label,
  size = 'md',
  showDetails = false,
  certStatus = 'certified'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRealNameOnly = type === 'real_name_creator' || label === '已实名创作者' || label === '实名创作者';

  const updateTooltipPosition = () => {
    const el = badgeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(384, window.innerWidth - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    setTooltipPos({
      top: rect.bottom + 8,
      left
    });
  };

  useLayoutEffect(() => {
    if (!showTooltip) return;
    updateTooltipPosition();
  }, [showTooltip]);

  useEffect(() => {
    if (!showTooltip) return;
    const onScrollOrResize = () => updateTooltipPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [showTooltip]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const openTooltip = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowTooltip(true);
  };

  const scheduleCloseTooltip = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowTooltip(false), 120);
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-[11px] px-2 py-0.5 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1.5'
  };
  const iconSizes = { sm: 10, md: 12, lg: 14 };

  if (certStatus === 'paused' || certStatus === 'revoked') {
    return (
      <span
        className={`inline-flex items-center rounded-md border font-bold ${sizeClasses[size]} bg-slate-100 text-slate-500 border-slate-200`}
        title={certStatus === 'paused' ? '认证已冻结' : '认证已撤销'}
      >
        {certStatus === 'paused' ? <AlertCircle size={iconSizes[size]} /> : <XCircle size={iconSizes[size]} />}
        <span>{certStatus === 'paused' ? '认证已冻结' : '认证已撤销'}</span>
      </span>
    );
  }

  if (isRealNameOnly) {
    return (
      <span
        className={`inline-flex items-center rounded-md border font-bold ${sizeClasses[size]} bg-slate-50 text-slate-600 border-slate-200`}
        title="已完成真人实名认证，提交入驻申请并通过审核后成为 AI 专家"
      >
        <CheckCircle2 size={iconSizes[size]} className="text-slate-500 shrink-0" />
        <span>{label || '已实名'}</span>
      </span>
    );
  }

  const displayLabel = label || 'AI 专家';
  const tooltip =
    showTooltip &&
    tooltipPos &&
    createPortal(
      <div
        className="fixed z-[9999] w-80 sm:w-96 max-w-[calc(100vw-24px)] p-4 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150 text-left pointer-events-auto"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleCloseTooltip}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs">
            <Award size={15} />
            <span>「{displayLabel}」认证说明</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-400/30">
            平台认证
          </span>
        </div>

        <p className="text-[11.5px] text-slate-200 leading-relaxed">
          已完成真人实名核验，并通过运营入驻审核。平台仅区分普通用户与 AI 专家，不再设置专家等级。
        </p>

        <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-[10.5px] text-amber-200/90 leading-relaxed">
          <div className="font-bold text-amber-300 mb-1 flex items-center gap-1">
            <Info size={12} />
            <span>官方声明：</span>
          </div>
          {AI_EXPERT_DISCLAIMER}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <span
        ref={badgeRef}
        className={`inline-flex items-center rounded-md border font-bold cursor-default ${sizeClasses[size]} bg-blue-50 text-blue-800 border-blue-300/80 hover:bg-blue-100/80`}
        onMouseEnter={showDetails ? openTooltip : undefined}
        onMouseLeave={showDetails ? scheduleCloseTooltip : undefined}
        title={showDetails ? undefined : displayLabel}
      >
        <Award size={iconSizes[size]} className="text-blue-600 shrink-0" />
        <span>{displayLabel}</span>
      </span>
      {showDetails ? tooltip : null}
    </>
  );
};
