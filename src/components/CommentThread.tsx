import React, { useState } from 'react';
import { Flag, Send, X } from 'lucide-react';

export type ThreadComment = {
  id: string;
  userName: string;
  userAvatar: string;
  isAuthor: boolean;
  content: string;
  createdAt: string;
  replies?: ThreadComment[];
};

const REPORT_REASONS = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'abuse', label: '辱骂骚扰' },
  { value: 'illegal', label: '违法违规' },
  { value: 'false_info', label: '虚假信息' },
  { value: 'other', label: '其他' }
] as const;

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface CommentThreadProps {
  comments: ThreadComment[];
  loading?: boolean;
  emptyText?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  submitBusy?: boolean;
  avatar?: string;
  placeholder?: string;
  onSubmitReport: (input: {
    comment: ThreadComment;
    reason: (typeof REPORT_REASONS)[number]['value'];
    detail: string;
  }) => Promise<void> | void;
  reportBusy?: boolean;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  loading,
  emptyText = '暂无评论，欢迎率先发表看法。',
  draft,
  onDraftChange,
  onSubmit,
  submitBusy,
  avatar,
  placeholder = '谈谈你的看法',
  onSubmitReport,
  reportBusy
}) => {
  const [reportTarget, setReportTarget] = useState<ThreadComment | null>(null);
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]['value']>('spam');
  const [reportDetail, setReportDetail] = useState('');

  const renderComment = (cmt: ThreadComment, nested = false) => (
    <div
      key={cmt.id}
      className={`rounded-xl border border-slate-200 bg-white p-3 space-y-2 ${nested ? 'ml-8 mt-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {cmt.userAvatar ? (
            <img
              src={cmt.userAvatar}
              alt=""
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <span className="w-7 h-7 rounded-full bg-slate-100 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="text-[12px] font-semibold text-slate-900 truncate">{cmt.userName}</div>
              {cmt.isAuthor && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  作者
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">{formatCommentTime(cmt.createdAt)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setReportTarget(cmt);
            setReportReason('spam');
            setReportDetail('');
          }}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
          title="举报评论"
        >
          <Flag size={11} />
          举报
        </button>
      </div>
      <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{cmt.content}</p>
      {cmt.replies?.map((reply) => renderComment(reply, true))}
    </div>
  );

  return (
    <div className="space-y-4">
      {loading && <p className="text-xs text-slate-400">评论加载中…</p>}
      {!loading && comments.length === 0 && <p className="text-xs text-slate-400">{emptyText}</p>}
      <div className="space-y-3">{comments.map((cmt) => renderComment(cmt))}</div>

      <div className="flex items-center gap-3 pt-2">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 opacity-80"
          />
        ) : (
          <span className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 h-10 focus-within:bg-white focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/5">
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim() && !submitBusy) onSubmit();
            }}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            disabled={!draft.trim() || submitBusy}
            onClick={onSubmit}
            className={`shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold cursor-pointer ${
              draft.trim() && !submitBusy
                ? 'text-slate-900 hover:text-blue-600'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <Send size={13} />
            <span>{submitBusy ? '发送中' : '发送'}</span>
          </button>
        </div>
      </div>

      {reportTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !reportBusy && setReportTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-black text-slate-900">举报评论</h3>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500 line-clamp-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
              {reportTarget.content}
            </p>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-500">举报原因</span>
              <select
                value={reportReason}
                onChange={(e) =>
                  setReportReason(e.target.value as (typeof REPORT_REASONS)[number]['value'])
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-500">补充说明（选填）</span>
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white resize-none"
                placeholder="请简要说明举报理由"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => setReportTarget(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={reportBusy}
                onClick={async () => {
                  try {
                    await onSubmitReport({
                      comment: reportTarget,
                      reason: reportReason,
                      detail: reportDetail.trim()
                    });
                    setReportTarget(null);
                    setReportDetail('');
                    setReportReason('spam');
                  } catch {
                    /* parent already toasted */
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {reportBusy ? '提交中…' : '提交举报'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
