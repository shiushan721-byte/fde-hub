import React, { useEffect, useState } from 'react';
import { Heart, MapPin, X } from 'lucide-react';
import { api } from '../lib/api';

type Review = {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  isAuthor: boolean;
  createdAt: string;
};

type WorkItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  likesCount: number;
  featured: boolean;
  inspireCategory: string;
  userName: string;
  userAvatar: string;
  createdAt: string;
  agent?: {
    id: string;
    title: string;
    category?: string;
    authorName?: string | null;
    authorId?: string | null;
  };
  reviews: Review[];
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function reviewLine(item: WorkItem, review: Review) {
  const author = item.agent?.authorName || '作者';
  const agent = item.agent?.title || '智能体';
  return `${review.userName} 于 ${formatDate(review.createdAt)} 在 ${author} 的智能体「${agent}」下评价`;
}

export const WorkRecommendationsPage = () => {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<WorkItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api<{ items: WorkItem[] }>('/api/admin/showcases?featured=true');
        if (!cancelled) {
          setItems(res.items || []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">作品推荐管理</h1>
        <p className="text-xs text-slate-500 mt-1">
          已推荐到前台的作品，卡片与发现灵感一致。卡片下方是谁、在什么时间、在谁的智能体下留下的评价。
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-400">还没有推荐到前台的作品。</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <article key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setDetail(item)}
              className="block w-full text-left cursor-pointer"
            >
              <div className="relative aspect-[3/4] max-h-72 bg-slate-100 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 via-black/25 to-transparent">
                  <div className="flex items-center gap-1.5 min-w-0 pr-16">
                    {item.userAvatar ? (
                      <img src={item.userAvatar} alt="" className="w-5 h-5 rounded-full object-cover border border-white/40" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-white/30" />
                    )}
                    <span className="text-[11px] text-white/95 truncate">{item.userName}</span>
                  </div>
                </div>
                <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-white/95">
                  <Heart size={12} />
                  {item.likesCount > 0 ? item.likesCount : '点赞'}
                </span>
              </div>
              <div className="px-3 py-2 space-y-1">
                <p className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug">{item.title || '未命名作品'}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                  <MapPin size={11} className="shrink-0 text-amber-500" />
                  <span className="truncate">{item.agent?.title || '智能体'}</span>
                </p>
              </div>
            </button>

            <div className="border-t border-slate-100 px-3 py-2.5 space-y-2">
              {item.reviews.length === 0 ? (
                <p className="text-[11px] text-slate-400">这条作品下还没有评价。</p>
              ) : (
                item.reviews.slice(0, 2).map((review) => (
                  <div key={review.id} className="space-y-0.5">
                    <p className="text-[11px] text-slate-500 leading-5">{reviewLine(item, review)}</p>
                    <p className="text-[12px] text-slate-800 leading-5 line-clamp-2">{review.content}</p>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => setDetail(item)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                详情{item.reviews.length > 2 ? ` · ${item.reviews.length} 条评价` : ''}
              </button>
            </div>
          </article>
        ))}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-white w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">作品详情</h2>
              <button type="button" onClick={() => setDetail(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            {detail.imageUrl ? (
              <img src={detail.imageUrl} alt="" referrerPolicy="no-referrer" className="w-full max-h-80 object-cover bg-slate-100" />
            ) : null}
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                {detail.userAvatar ? (
                  <img src={detail.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-slate-200" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{detail.userName}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(detail.createdAt)} · 内容由用户上传</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{detail.title || '未命名作品'}</h3>
                <p className="text-[11px] text-slate-400 mt-1">{detail.inspireCategory || detail.agent?.category || '未分类'}</p>
                <p className="text-sm text-slate-600 mt-2 leading-6">{detail.description || '未填写介绍。'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="text-[11px] text-slate-400">所属智能体</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{detail.agent?.title || '智能体'}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">创作者 {detail.agent?.authorName || '—'}</p>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400">评价 {detail.reviews.length}</p>
                {detail.reviews.length === 0 ? (
                  <p className="text-xs text-slate-400">还没有评价。</p>
                ) : (
                  detail.reviews.map((review) => (
                    <div key={review.id} className="border-t border-slate-100 pt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        {review.userAvatar ? (
                          <img src={review.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-slate-200" />
                        )}
                        <p className="text-xs font-bold text-slate-900">{review.userName}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-5">{reviewLine(detail, review)}</p>
                      <p className="text-sm text-slate-800 leading-6">{review.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
