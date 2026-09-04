import React, { useState } from 'react';
import { api } from '../lib/api';

function useAdminQuery<T>(path: string, extraKey = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, [path, extraKey]);

  return { data, error, loading, reload: load };
};

type CommentReportRow = {
  id: string;
  commentId: string;
  agentId: string;
  source?: 'agent' | 'showcase';
  sourceLabel?: string;
  reporterName: string;
  reason: string;
  reasonLabel: string;
  detail: string;
  status: string;
  reviewNote: string;
  createdAt: string;
  reviewedAt?: string | null;
  commentContent: string;
  commentUserName: string;
  commentCreatedAt?: string | null;
  agentTitle: string;
  agentAuthorName?: string;
  showcaseTitle?: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  dismissed: '已忽略',
  removed: '已删评'
};

export const CommentReportsPage = () => {
  const [filter, setFilter] = useState('pending');
  const [sourceFilter, setSourceFilter] = useState('');
  const [busy, setBusy] = useState('');
  const query = new URLSearchParams({
    ...(filter ? { status: filter } : {}),
    ...(sourceFilter ? { source: sourceFilter } : {})
  }).toString();
  const { data, error, loading, reload } = useAdminQuery<CommentReportRow[]>(
    `/api/admin/comment-reports${query ? `?${query}` : ''}`,
    query
  );

  const refreshAll = async () => {
    await reload();
  };

  const runAction = async (id: string, action: 'dismiss' | 'remove-comment') => {
    const label = action === 'dismiss' ? '忽略该举报' : '删除评论并结案';
    if (!window.confirm(`确认${label}？`)) return;
    setBusy(id);
    try {
      await api(`/api/admin/comment-reports/${id}/${action}`, { method: 'POST' });
      await refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">评论举报</h1>
          <p className="text-xs text-slate-500 mt-1">
            处理用户对智能体评论或成果评论的举报；删除评论将同步移除该评论及其回复。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="">全部来源</option>
            <option value="agent">智能体评论</option>
            <option value="showcase">成果评论</option>
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="pending">待处理</option>
            <option value="dismissed">已忽略</option>
            <option value="removed">已删评</option>
            <option value="">全部状态</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="space-y-3">
        {(data || []).map((report) => (
          <div key={report.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      report.source === 'showcase'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {report.sourceLabel || (report.source === 'showcase' ? '成果评论' : '智能体评论')}
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {report.source === 'showcase' && report.showcaseTitle
                      ? report.showcaseTitle
                      : report.agentTitle}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {report.source === 'showcase'
                    ? `基于智能体 ${report.agentTitle} · 作者 ${report.agentAuthorName || '—'}`
                    : `作者 ${report.agentAuthorName || '—'}`}
                  {` · 举报人 ${report.reporterName}`}
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  report.status === 'pending'
                    ? 'bg-amber-50 text-amber-700'
                    : report.status === 'removed'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {STATUS_LABEL[report.status] || report.status}
              </span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5">
              <div className="text-[11px] text-slate-400">
                被举报评论 · {report.commentUserName}
                {report.commentCreatedAt
                  ? ` · ${new Date(report.commentCreatedAt).toLocaleString()}`
                  : ''}
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {report.commentContent}
              </p>
            </div>

            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-800">举报原因：</span>
              {report.reasonLabel}
              {report.detail ? ` · ${report.detail}` : ''}
            </div>
            <div className="text-[10px] text-slate-400">
              举报时间 {new Date(report.createdAt).toLocaleString()}
              {report.reviewedAt ? ` · 处理于 ${new Date(report.reviewedAt).toLocaleString()}` : ''}
              {report.reviewNote ? ` · ${report.reviewNote}` : ''}
            </div>

            {report.status === 'pending' && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy === report.id}
                  onClick={() => void runAction(report.id, 'dismiss')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  忽略举报
                </button>
                <button
                  type="button"
                  disabled={busy === report.id}
                  onClick={() => void runAction(report.id, 'remove-comment')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  删除评论
                </button>
              </div>
            )}
          </div>
        ))}
        {!loading && (data || []).length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">当前筛选下没有举报记录。</p>
        )}
      </div>
    </div>
  );
};
