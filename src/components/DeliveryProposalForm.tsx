import React, { useState } from 'react';
import { X, Send, FileText } from 'lucide-react';
import { DeliveryProposal, PLATFORM_ESCROW_RULES } from '../types/deliveryProposal';

interface DeliveryProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  baseAgentTitle: string;
  baseAgentVersion: string;
  baseAgentId?: string;
  initialCustomization?: string;
  onSubmit: (proposal: Omit<DeliveryProposal, 'submittedAt' | 'version'>) => Promise<void>;
}

export const DeliveryProposalForm: React.FC<DeliveryProposalFormProps> = ({
  isOpen,
  onClose,
  baseAgentTitle,
  baseAgentVersion,
  baseAgentId,
  initialCustomization = '',
  onSubmit
}) => {
  const [customizationItems, setCustomizationItems] = useState(initialCustomization);
  const [excludedItems, setExcludedItems] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [priceYuan, setPriceYuan] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('14');
  const [freeRevisionCount, setFreeRevisionCount] = useState('2');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [afterSalePeriodDays, setAfterSalePeriodDays] = useState('30');
  const [needsCustomerData, setNeedsCustomerData] = useState(false);
  const [customerDataNote, setCustomerDataNote] = useState('');
  const [needsThirdPartyAccess, setNeedsThirdPartyAccess] = useState(false);
  const [thirdPartyNote, setThirdPartyNote] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const splitLines = (text: string) =>
    text
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(Number(priceYuan) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      alert('请填写有效交付价格');
      return;
    }
    const items = splitLines(customizationItems);
    const delivers = splitLines(deliverables);
    if (!items.length || !delivers.length || !acceptanceCriteria.trim()) {
      alert('请填写定制需求、交付成果与验收标准');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        baseAgentId: baseAgentId || '',
        baseAgentTitle,
        baseAgentVersion,
        customizationItems: items,
        excludedItems: splitLines(excludedItems),
        deliverables: delivers,
        priceCents,
        deliveryDays: Number(deliveryDays) || 14,
        freeRevisionCount: Number(freeRevisionCount) || 2,
        acceptanceCriteria: acceptanceCriteria.trim(),
        afterSalePeriodDays: Number(afterSalePeriodDays) || 30,
        needsCustomerData,
        customerDataNote: needsCustomerData ? customerDataNote : undefined,
        needsThirdPartyAccess,
        thirdPartyNote: needsThirdPartyAccess ? thirdPartyNote : undefined,
        note: note.trim() || undefined
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">发起定制交付方案</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
            <div className="font-bold">基础通用智能体</div>
            <div className="mt-0.5">
              {baseAgentTitle} · {baseAgentVersion}
            </div>
          </div>

          <Field label="定制需求清单（每行一项）" required>
            <textarea
              rows={3}
              value={customizationItems}
              onChange={(e) => setCustomizationItems(e.target.value)}
              className="field-input"
              placeholder="例如：接入聚水潭 ERP&#10;钉钉售后群消息同步"
            />
          </Field>

          <Field label="不包含的内容（每行一项）">
            <textarea
              rows={2}
              value={excludedItems}
              onChange={(e) => setExcludedItems(e.target.value)}
              className="field-input"
              placeholder="例如：不含历史数据迁移"
            />
          </Field>

          <Field label="交付成果（每行一项）" required>
            <textarea
              rows={2}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              className="field-input"
              placeholder="例如：客户专属智能体 v1.0&#10;部署文档与使用说明"
            />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="交付价格（元）" required>
              <input type="number" min={1} value={priceYuan} onChange={(e) => setPriceYuan(e.target.value)} className="field-input" />
            </Field>
            <Field label="预计交付（天）" required>
              <input type="number" min={1} value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} className="field-input" />
            </Field>
            <Field label="免费修改次数">
              <input type="number" min={0} value={freeRevisionCount} onChange={(e) => setFreeRevisionCount(e.target.value)} className="field-input" />
            </Field>
            <Field label="售后周期（天）">
              <input type="number" min={0} value={afterSalePeriodDays} onChange={(e) => setAfterSalePeriodDays(e.target.value)} className="field-input" />
            </Field>
          </div>

          <Field label="验收标准" required>
            <textarea
              rows={2}
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              className="field-input"
              placeholder="例如：退换货流程可跑通；钉钉群可收到通知"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
              <input type="checkbox" checked={needsCustomerData} onChange={(e) => setNeedsCustomerData(e.target.checked)} className="mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-slate-800">需用户提供数据</span>
                {needsCustomerData && (
                  <input
                    value={customerDataNote}
                    onChange={(e) => setCustomerDataNote(e.target.value)}
                    placeholder="说明数据类型"
                    className="field-input mt-1.5"
                  />
                )}
              </div>
            </label>
            <label className="flex items-start gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
              <input type="checkbox" checked={needsThirdPartyAccess} onChange={(e) => setNeedsThirdPartyAccess(e.target.checked)} className="mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-slate-800">需第三方账号/接口</span>
                {needsThirdPartyAccess && (
                  <input
                    value={thirdPartyNote}
                    onChange={(e) => setThirdPartyNote(e.target.value)}
                    placeholder="ERP / 钉钉 / Shopify..."
                    className="field-input mt-1.5"
                  />
                )}
              </div>
            </label>
          </div>

          <Field label="补充说明">
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="field-input" />
          </Field>

          <p className="text-[11px] text-slate-500 leading-relaxed p-3 bg-slate-50 rounded-xl border border-slate-100">
            {PLATFORM_ESCROW_RULES}
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer">
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Send size={14} />
              {submitting ? '提交中…' : '发起定制交付方案'}
            </button>
          </div>
        </form>
      </div>
      <style>{`.field-input{width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:0.75rem;font-size:0.75rem;color:#0f172a;outline:none}.field-input:focus{border-color:#3b82f6}`}</style>
    </div>
  );
};

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-bold text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
