import React, { useEffect, useState } from 'react';
import { ChevronLeft, Heart, Eye, Bot, User } from 'lucide-react';
import type { PublicInspiration } from '../lib/inspiration';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import { getMockShowcaseComments } from '../data/agentSocialMock';
import { CommentThread, type ThreadComment } from './CommentThread';

function formatShortDate(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}/${mm}/${dd}`;
}

function mediaKind(item: PublicInspiration): 'image' | 'video' | 'document' {
  const name = `${item.fileName || ''} ${item.imageUrl}`.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)(\b|$)/i.test(name)) return 'video';
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv)(\b|$)/i.test(name)) return 'document';
  return 'image';
}

function InspirationMedia({ item }: { item: PublicInspiration }) {
  const kind = mediaKind(item);
  if (kind === 'video') {
    return (
      <video src={item.imageUrl} controls className="w-full max-h-[70vh] bg-slate-950" />
    );
  }
  if (kind === 'document') {
    const isPdf = /\.pdf(\b|$)/i.test(`${item.fileName || ''} ${item.imageUrl}`);
    if (isPdf) {
      return (
        <iframe
          title={item.title}
          src={item.imageUrl}
          className="w-full h-[70vh] bg-white"
        />
      );
    }
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-3 bg-slate-100">
        <p className="text-sm text-slate-500">该文档需在新窗口打开</p>
        <a
          href={item.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
        >
          打开文档
        </a>
      </div>
    );
  }
  return (
    <img
      src={item.imageUrl}
      alt={item.title}
      referrerPolicy="no-referrer"
      className="w-full max-h-[70vh] object-contain bg-slate-950"
    />
  );
}

interface InspirationDetailViewProps {
  item: PublicInspiration;
  onBack: () => void;
  onOpenAgent: (agentId: string) => void;
  onOpenAgentAuthor: (authorId: string) => void;
  backLabel?: string;
  onToast?: (message: string) => void;
}

export const InspirationDetailView: React.FC<InspirationDetailViewProps> = ({
  item,
  onBack,
  onOpenAgent,
  onOpenAgentAuthor,
  backLabel = '返回发现灵感',
  onToast
}) => {
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const likes = item.likesCount + (liked ? 1 : 0);
  const views = Math.max(item.likesCount * 8, 12);
  const tags = [
    item.inspireCategory,
    item.agent.category,
    '用户成果',
    item.featured ? '运营推荐' : null
  ].filter((tag): tag is string => Boolean(tag));

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await api<{ comments: ThreadComment[] }>(
        `/api/public/inspirations/${encodeURIComponent(item.id)}/comments`
      );
      const next = res.comments || [];
      setComments(next);
    } catch {
      setComments(getMockShowcaseComments(item.id, item.user.name, item.user.avatar));
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    void loadComments();
  }, [item.id]);

  const submitComment = async () => {
    const content = commentDraft.trim();
    if (!content) return;
    setCommentBusy(true);
    try {
      await ensureMarketplaceSession();
      const created = await api<ThreadComment>(
        `/api/public/inspirations/${encodeURIComponent(item.id)}/comments`,
        { method: 'POST', body: JSON.stringify({ content }) }
      );
      setComments((prev) => [created, ...prev]);
      setCommentDraft('');
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '评论失败，请先登录后重试');
    } finally {
      setCommentBusy(false);
    }
  };

  const submitReport = async (input: {
    comment: ThreadComment;
    reason: 'spam' | 'abuse' | 'illegal' | 'false_info' | 'other';
    detail: string;
  }) => {
    setReportBusy(true);
    try {
      await ensureMarketplaceSession();
      await api(
        `/api/public/inspirations/${encodeURIComponent(item.id)}/comments/${input.comment.id}/report`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: input.reason, detail: input.detail })
        }
      );
      onToast?.('举报已提交，处理进展将发送至站内信');
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '举报失败，请先登录后重试');
      throw err;
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div id="inspiration-detail-view" className="min-h-full bg-slate-50">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-4 sm:py-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-0.5 text-[13px] text-slate-500 hover:text-slate-900 cursor-pointer mb-4"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          <span>{backLabel}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-8 items-start">
          <div className="min-w-0 space-y-4">
            <header className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h1 className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-snug">
                {item.title}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[12px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={13} />
                    {views}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLiked((v) => !v)}
                    className={`inline-flex items-center gap-1 cursor-pointer ${
                      liked ? 'text-rose-500' : 'hover:text-rose-500'
                    }`}
                  >
                    <Heart size={13} className={liked ? 'fill-rose-500' : ''} />
                    {likes}
                  </button>
                </div>
              </div>
            </header>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100">
                <InspirationMedia item={item} />
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                  <span>成果介绍</span>
                  <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                    <span>最近更新：{formatShortDate(item.updatedAt || item.createdAt)}</span>
                    <span>首次发布：{formatShortDate(item.createdAt)}</span>
                  </span>
                </div>
                <p className="text-[14px] text-slate-700 leading-[1.8] whitespace-pre-wrap">
                  {item.description || '作者还没有填写介绍，先看看作品本身。'}
                </p>
              </div>
            </div>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-slate-900">评论</h2>
                <span className="text-[12px] text-slate-400">{comments.length}</span>
              </div>
              <CommentThread
                comments={comments}
                loading={commentsLoading}
                draft={commentDraft}
                onDraftChange={setCommentDraft}
                onSubmit={() => void submitComment()}
                submitBusy={commentBusy}
                avatar={item.user.avatar}
                placeholder="谈谈对这条成果的看法"
                onSubmitReport={submitReport}
                reportBusy={reportBusy}
              />
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-[11px] font-bold text-slate-400">成果作者</p>
              <div className="flex items-center gap-3">
                {item.user.avatar ? (
                  <img
                    src={item.user.avatar}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <span className="w-11 h-11 rounded-full bg-slate-100" />
                )}
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-slate-900 truncate">
                    {item.user.name}
                  </div>
                  <div className="text-[11px] text-slate-400">上传了这条成果</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-[11px] font-bold text-slate-400">基于智能体</p>
              <button
                type="button"
                onClick={() => onOpenAgent(item.agent.id)}
                className="w-full text-left rounded-xl border border-slate-200 overflow-hidden hover:border-blue-400 cursor-pointer"
              >
                <img
                  src={item.agent.coverImage}
                  alt=""
                  className="w-full h-28 object-cover bg-slate-100"
                />
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-1 text-blue-600 text-[11px] font-bold">
                    <Bot size={12} />
                    查看智能体
                  </div>
                  <p className="text-[13px] font-semibold text-slate-900 line-clamp-2">
                    {item.agent.title}
                  </p>
                  <p className="text-[11px] text-slate-400">{item.agent.category}</p>
                </div>
              </button>

              {item.agentAuthor && (
                <button
                  type="button"
                  onClick={() => onOpenAgentAuthor(item.agentAuthor!.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {item.agentAuthor.avatar ? (
                    <img
                      src={item.agentAuthor.avatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                      <User size={14} className="text-slate-400" />
                    </span>
                  )}
                  <div className="min-w-0 text-left">
                    <div className="text-[12px] font-semibold text-slate-900 truncate">
                      {item.agentAuthor.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      智能体作者{item.agentAuthor.title ? ` · ${item.agentAuthor.title}` : ''}
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenAgent(item.agent.id)}
                className="w-full h-10 rounded-xl bg-slate-900 text-white text-[13px] font-bold cursor-pointer hover:bg-slate-800"
              >
                使用同款智能体
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
