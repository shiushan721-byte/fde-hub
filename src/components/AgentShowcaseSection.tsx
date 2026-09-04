import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Star, X } from 'lucide-react';
import { api } from '../lib/api';
import { ensureAgentAuthorSession, ensureMarketplaceSession } from '../lib/marketplaceAuth';
import { getMockShowcases } from '../data/agentSocialMock';

export type AgentShowcaseItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description?: string;
  imageUrl: string;
  fileName?: string;
  likesCount?: number;
  featured: boolean;
  hidden: boolean;
  createdAt: string;
};

interface AgentShowcaseSectionProps {
  agentId: string;
  authorId?: string;
  enableAuthorTools?: boolean;
  onToast?: (message: string) => void;
  embedded?: boolean;
  onCountChange?: (count: number) => void;
  onOpenDetail?: (item: AgentShowcaseItem) => void;
}

async function uploadShowcaseImage(file: File) {
  const buf = await file.arrayBuffer();
  const res = await fetch('/api/me/uploads/image', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name)
    },
    body: buf
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    data?: { url: string; fileName: string };
    error?: { message?: string };
  } | null;
  if (!res.ok || !json?.ok || !json.data) {
    throw new Error(json?.error?.message || '图片上传失败');
  }
  return json.data;
}

export const AgentShowcaseSection: React.FC<AgentShowcaseSectionProps> = ({
  agentId,
  authorId,
  enableAuthorTools = false,
  onToast,
  embedded = false,
  onCountChange,
  onOpenDetail
}) => {
  const [items, setItems] = useState<AgentShowcaseItem[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (enableAuthorTools && authorId) {
        await ensureAgentAuthorSession(authorId);
      } else {
        await ensureMarketplaceSession();
      }
      const res = await api<{
        items: AgentShowcaseItem[];
        canModerate: boolean;
        viewerUserId: string | null;
      }>(`/api/public/agents/${agentId}/showcases`);
      const next = res.items || [];
      setItems(next.length > 0 ? next : getMockShowcases(agentId));
      setCanModerate(Boolean(res.canModerate));
      setViewerUserId(res.viewerUserId);
    } catch {
      setItems(getMockShowcases(agentId));
      setCanModerate(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [agentId, authorId, enableAuthorTools]);

  const resetUpload = () => {
    setUploadOpen(false);
    setTitle('');
    setDescription('');
    setFile(null);
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const submitUpload = async () => {
    if (!file) {
      onToast?.('请上传成果图片');
      return;
    }
    if (!title.trim()) {
      onToast?.('请填写成果标题');
      return;
    }
    if (!description.trim()) {
      onToast?.('请填写成果介绍');
      return;
    }
    setSaving(true);
    try {
      await ensureMarketplaceSession();
      const uploaded = await uploadShowcaseImage(file);
      await api(`/api/me/agents/${agentId}/showcases`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          imageUrl: uploaded.url,
          fileName: uploaded.fileName
        })
      });
      resetUpload();
      onToast?.('成果已发布');
      await load();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '上传失败');
    } finally {
      setSaving(false);
    }
  };

  const moderate = async (item: AgentShowcaseItem, patch: { featured?: boolean; hidden?: boolean }) => {
    if (item.id.startsWith('mock_')) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                featured: patch.featured ?? row.featured,
                hidden: patch.hidden ?? row.hidden
              }
            : row
        )
      );
      onToast?.(patch.featured ? '已设为精选' : patch.featured === false ? '已取消精选' : '已更新');
      return;
    }
    setBusyId(item.id);
    try {
      if (enableAuthorTools && authorId) {
        await ensureAgentAuthorSession(authorId);
      } else {
        await ensureMarketplaceSession();
      }
      await api(`/api/me/agents/${agentId}/showcases/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });
      await load();
      onToast?.(
        patch.featured ? '已精选该成果' : patch.featured === false ? '已取消精选' : '已更新成果'
      );
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (item: AgentShowcaseItem) => {
    if (!window.confirm('确定删除这条成果？')) return;
    setBusyId(item.id);
    try {
      await api(`/api/me/agents/${agentId}/showcases/${item.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '删除失败');
    } finally {
      setBusyId('');
    }
  };

  const visibleCount = items.filter((item) => !item.hidden).length;

  useEffect(() => {
    onCountChange?.(visibleCount);
  }, [visibleCount, onCountChange]);

  const body = (
    <div className="space-y-4">
      <div className={`flex items-center ${embedded ? 'justify-end' : 'justify-between'} gap-3`}>
        {!embedded && (
          <h3 className="text-[14px] font-semibold text-slate-900">
            成果展示
            <span className="ml-1.5 text-slate-400 font-medium">{visibleCount}</span>
          </h3>
        )}
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-900 text-white text-[12px] font-semibold cursor-pointer hover:bg-slate-800"
        >
          <ImagePlus size={13} />
          上传成果
        </button>
      </div>

      {canModerate && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          你是作者，可精选或隐藏用户上传的成果。精选后会优先展示在前台。
        </p>
      )}

      {loading && <p className="text-xs text-slate-400">成果加载中…</p>}
      {!loading && items.length === 0 && (
        <p className="text-xs text-slate-400">还没有人上传成果，用过这个智能体后可以分享你的作品。</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const own = viewerUserId === item.userId;
          return (
            <article
              key={item.id}
              className={`rounded-xl border overflow-hidden bg-white ${
                item.hidden ? 'border-dashed border-slate-200 opacity-70' : 'border-slate-200'
              }`}
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(item)}
                  className="block w-full h-full cursor-pointer"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title || '成果'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
                {item.featured && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold pointer-events-none">
                    <Star size={10} className="fill-white" />
                    精选
                  </span>
                )}
                {item.hidden && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] font-bold pointer-events-none">
                    已隐藏
                  </span>
                )}
                {canModerate && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void moderate(item, { featured: !item.featured })}
                    className={`absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer disabled:opacity-60 ${
                      item.featured
                        ? 'bg-white text-amber-700'
                        : 'bg-black/55 text-white hover:bg-black/70'
                    }`}
                  >
                    <Star size={11} className={item.featured ? 'fill-amber-500 text-amber-500' : ''} />
                    {busyId === item.id ? '处理中…' : item.featured ? '取消精选' : '精选'}
                  </button>
                )}
              </div>
              <div className="p-2.5 space-y-2">
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(item)}
                  className="min-w-0 w-full text-left cursor-pointer"
                >
                  <p className="text-[12px] font-semibold text-slate-900 line-clamp-1">
                    {item.title || '未命名成果'}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {item.description || '点击查看成果详情'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-1">{item.userName}</p>
                </button>
                {(canModerate || own) && (
                  <div className="flex flex-wrap gap-1">
                    {canModerate && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void moderate(item, { featured: !item.featured })}
                          className="px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                        >
                          {item.featured ? '取消精选' : '精选'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void moderate(item, { hidden: !item.hidden })}
                          className="px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                        >
                          {item.hidden ? '显示' : '隐藏'}
                        </button>
                      </>
                    )}
                    {own && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void remove(item)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        删除
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !saving && resetUpload()}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">上传成果</h4>
                <p className="text-xs text-slate-500 mt-1">
                  请同时上传作品，并写清标题和介绍。推荐后会出现在「发现灵感」。
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={resetUpload}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[16/10] rounded-xl border border-dashed border-slate-300 bg-slate-50 overflow-hidden cursor-pointer hover:border-slate-400"
            >
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-xs text-slate-400">
                  点击上传成果图片（png / jpg / webp，不超过 8MB）
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const next = e.target.files?.[0];
                if (!next) return;
                if (next.size > 8 * 1024 * 1024) {
                  onToast?.('图片请不超过 8MB');
                  return;
                }
                setFile(next);
                setPreview(URL.createObjectURL(next));
              }}
            />
            <label className="block text-[11px] font-semibold text-slate-700">
              成果标题
              <input
                type="text"
                maxLength={40}
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 40))}
                placeholder="例如：主视觉分镜稿"
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-900"
              />
            </label>
            <label className="block text-[11px] font-semibold text-slate-700">
              成果介绍
              <textarea
                rows={4}
                maxLength={800}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 800))}
                placeholder="介绍你怎么做的、用了哪些能力、适合什么场景"
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-900 resize-none"
              />
              <span className="mt-1 block text-[10px] text-slate-400 font-medium">
                {description.trim().length}/800
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={resetUpload}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={saving || !file || !title.trim() || !description.trim()}
                onClick={() => void submitUpload()}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {saving ? '发布中…' : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return body;
  return <section className="pt-2 border-t border-slate-100">{body}</section>;
};
