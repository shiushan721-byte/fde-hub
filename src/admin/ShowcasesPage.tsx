import React, { useState } from 'react';
import { api } from '../lib/api';
import {
  INSPIRATION_CATEGORY_LABELS,
  guessInspirationCategory,
  type InspirationCategory
} from '../../shared/inspirationCategories';

type ShowcaseRow = {
  id: string;
  agentId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description?: string;
  imageUrl: string;
  fileName?: string;
  likesCount?: number;
  featured: boolean;
  hidden: boolean;
  inspireCategory?: string;
  createdAt: string;
  agent?: {
    id: string;
    title: string;
    category?: string;
    coverImage?: string | null;
    authorName?: string | null;
  };
};

export function RecommendCategoryDialog({
  title,
  defaultCategory,
  busy,
  onConfirm,
  onClose
}: {
  title: string;
  defaultCategory?: string;
  busy?: boolean;
  onConfirm: (category: InspirationCategory) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<InspirationCategory>(
    (INSPIRATION_CATEGORY_LABELS as readonly string[]).includes(defaultCategory || '')
      ? (defaultCategory as InspirationCategory)
      : '图片'
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-sm font-black text-slate-900">推荐到发现灵感</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{title || '未命名成果'}</p>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400">选择前台分类</p>
          <div className="grid grid-cols-2 gap-2">
            {INSPIRATION_CATEGORY_LABELS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`h-10 rounded-xl text-xs font-bold cursor-pointer border ${
                  category === item
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(category)}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {busy ? '处理中…' : '确认推荐'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ShowcasesPage = () => {
  const [q, setQ] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShowcaseRow[]>([]);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [pick, setPick] = useState<ShowcaseRow | null>(null);

  const query = new URLSearchParams({
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(featuredFilter ? { featured: featuredFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {})
  }).toString();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api<{ total: number; featuredCount: number; items: ShowcaseRow[] }>(
        `/api/admin/showcases${query ? `?${query}` : ''}`
      );
      setItems(res.items || []);
      setFeaturedCount(res.featuredCount || 0);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, [query]);

  const patchItem = async (
    item: ShowcaseRow,
    body: { featured?: boolean; inspireCategory?: string }
  ) => {
    setBusyId(item.id);
    try {
      await api(`/api/admin/agents/${item.agentId}/showcases/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
      setPick(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">作品展示</h1>
          <p className="text-xs text-slate-500 mt-1">
            推荐用户成果到前台「发现灵感」，并指定分类：视频、图片、网页、其他。当前已推荐 {featuredCount} 条。
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索成果、作者或智能体"
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white w-56"
        />
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="">全部状态</option>
          <option value="true">已推荐</option>
          <option value="false">未推荐</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="">全部分类</option>
          {INSPIRATION_CATEGORY_LABELS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className={`rounded-xl border p-3 ${
              item.hidden ? 'border-dashed border-slate-200 opacity-70' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-lg object-cover bg-slate-100 shrink-0"
                />
              ) : (
                <span className="w-20 h-20 rounded-lg bg-slate-100 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.title || '未命名成果'}</p>
                  {item.featured && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                      已推荐{item.inspireCategory ? ` · ${item.inspireCategory}` : ''}
                    </span>
                  )}
                  {item.hidden && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                      已隐藏
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {item.userName} · {item.agent?.title || '智能体'}
                </p>
                {item.description ? (
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">{item.description}</p>
                ) : null}
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(item.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() =>
                    item.featured
                      ? void patchItem(item, { featured: false })
                      : setPick(item)
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-60 ${
                    item.featured
                      ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {busyId === item.id ? '处理中…' : item.featured ? '取消推荐' : '推荐'}
                </button>
                {item.featured && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => setPick(item)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    改分类
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">当前筛选下没有作品。</p>
        )}
      </div>

      {pick && (
        <RecommendCategoryDialog
          title={pick.title}
          defaultCategory={pick.inspireCategory || guessInspirationCategory(pick)}
          busy={busyId === pick.id}
          onClose={() => setPick(null)}
          onConfirm={(category) => void patchItem(pick, { featured: true, inspireCategory: category })}
        />
      )}
    </div>
  );
};
