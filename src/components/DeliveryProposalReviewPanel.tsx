import React, { useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare, Shield, X } from 'lucide-react';
import { DeliveryProposal, PLATFORM_ESCROW_RULES } from '../types/deliveryProposal';
import { yuan, formatOrderTime } from '../lib/customOrderLabels';

interface DeliveryProposalReviewPanelProps {
  proposal: DeliveryProposal;
  proposalVersion?: number;
  proposalSubmittedAt?: string;
  /** 只读查看（确认后各环节） */
  readOnly?: boolean;
  statusHint?: string;
  onConfirm?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onRequestRevision?: (feedback: string) => Promise<void>;
}

export function hasViewableProposal(proposal?: DeliveryProposal | null): boolean {
  if (!proposal) return false;
  return (
    (proposal.customizationItems?.length ?? 0) > 0 ||
    (proposal.deliverables?.length ?? 0) > 0 ||
    (proposal.priceCents ?? 0) > 0
  );
}

export const DeliveryProposalReviewPanel: React.FC<DeliveryProposalReviewPanelProps> = ({
  proposal,
  proposalVersion,
  proposalSubmittedAt,
  readOnly = false,
  statusHint,
  onConfirm,
  onReject,
  onRequestRevision
}) => {
  const [ackScope, setAckScope] = useState(false);
  const [ackAmount, setAckAmount] = useState(false);
  const [ackTime, setAckTime] = useState(false);
  const [ackAcceptance, setAckAcceptance] = useState(false);
  const [ackRevisions, setAckRevisions] = useState(false);
  const [ackEscrow, setAckEscrow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const allAcked = ackScope && ackAmount && ackTime && ackAcceptance && ackRevisions && ackEscrow;
  const canAct = !readOnly && onConfirm && onReject && onRequestRevision;

  const handleConfirm = async () => {
    if (!onConfirm) return;
    if (!allAcked) {
      alert('请勾选全部确认项后再同意方案');
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    const reason = feedback.trim() || window.prompt('请说明拒绝原因') || '';
    if (!reason) return;
    setBusy(true);
    try {
      await onReject(reason);
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handleRevision = async () => {
    if (!onRequestRevision) return;
    if (!feedback.trim()) {
      alert('请填写希望修改的内容');
      return;
    }
    setBusy(true);
    try {
      await onRequestRevision(feedback.trim());
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-4 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-violet-900 text-sm">定制交付方案</h3>
          <p className="text-violet-700 mt-0.5">
            版本 v{proposalVersion ?? proposal.version ?? 1}
            {proposalSubmittedAt ? ` · 提交于 ${formatOrderTime(proposalSubmittedAt)}` : ''}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-bold text-[10px]">
          {statusHint || (readOnly ? '已确认方案' : '待确认')}
        </span>
      </div>

      <ProposalSection title="基础智能体">
        {proposal.baseAgentTitle} · {proposal.baseAgentVersion}
      </ProposalSection>

      <ProposalSection title="定制需求">
        <ul className="list-disc pl-4 space-y-0.5">
          {(proposal.customizationItems || []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </ProposalSection>

      {proposal.excludedItems?.length ? (
        <ProposalSection title="不包含">
          <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
            {proposal.excludedItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </ProposalSection>
      ) : null}

      <ProposalSection title="交付成果">
        <ul className="list-disc pl-4 space-y-0.5">
          {(proposal.deliverables || []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </ProposalSection>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="交付价格" value={yuan(proposal.priceCents)} />
        <Metric label="预计交付" value={`${proposal.deliveryDays} 天`} />
        <Metric label="免费修改" value={`${proposal.freeRevisionCount} 次`} />
        <Metric label="售后周期" value={`${proposal.afterSalePeriodDays} 天`} />
      </div>

      <ProposalSection title="验收标准">{proposal.acceptanceCriteria || '—'}</ProposalSection>

      {(proposal.needsCustomerData || proposal.needsThirdPartyAccess) && (
        <ProposalSection title="需您配合">
          {proposal.needsCustomerData && <p>需提供数据：{proposal.customerDataNote || '见沟通记录'}</p>}
          {proposal.needsThirdPartyAccess && <p>需第三方账号：{proposal.thirdPartyNote || '见沟通记录'}</p>}
        </ProposalSection>
      )}

      {proposal.note && <ProposalSection title="补充说明">{proposal.note}</ProposalSection>}

      {canAct && (
        <>
          <div className="p-3 bg-white border border-violet-100 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Shield size={14} className="text-violet-600" />
              确认方案前请逐项勾选
            </div>
            <AckCheckbox checked={ackScope} onChange={setAckScope} label="我已确认需求范围与交付清单" />
            <AckCheckbox
              checked={ackAmount}
              onChange={setAckAmount}
              label={`我已确认订单金额 ${yuan(proposal.priceCents)}`}
            />
            <AckCheckbox
              checked={ackTime}
              onChange={setAckTime}
              label={`我已确认预计交付时间 ${proposal.deliveryDays} 天`}
            />
            <AckCheckbox checked={ackAcceptance} onChange={setAckAcceptance} label="我已确认验收标准" />
            <AckCheckbox
              checked={ackRevisions}
              onChange={setAckRevisions}
              label={`我已确认免费修改 ${proposal.freeRevisionCount} 次及验收规则`}
            />
            <AckCheckbox
              checked={ackEscrow}
              onChange={setAckEscrow}
              label="我已了解平台托管及争议处理规则"
            />
            <p className="text-[10px] text-slate-500 pt-1">{PLATFORM_ESCROW_RULES}</p>
          </div>

          <textarea
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="如需修改方案，请在此说明；拒绝方案时也请填写原因"
            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 size={14} />
              同意方案并进入付款
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleRevision}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare size={14} />
              要求修改方案
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleReject}
              className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle size={14} />
              拒绝方案
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const DeliveryProposalModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title = '定制交付方案', children }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[88vh] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

function ProposalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-bold text-slate-700 mb-1">{title}</div>
      <div className="text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-white rounded-xl border border-slate-100">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function AckCheckbox({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}
