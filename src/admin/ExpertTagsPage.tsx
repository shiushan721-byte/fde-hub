import React, { useEffect, useMemo, useState } from 'react';
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
}

type ExpertTagRow = {
  id: string;
  name: string;
  sortOrder: number;
  status: string;
  expertCount?: number;
};

type TagExpertRow = {
  id: string;
  name: string;
  expertNo: string;
  domainTags: string[];
};

export const ExpertTagsPage = () => {
  const { data, error, loading, reload } = useAdminQuery<ExpertTagRow[]>('/api/admin/expert-tags');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState('');
  const [offlineTarget, setOfflineTarget] = useState<ExpertTagRow | null>(null);
  const [editTarget, setEditTarget] = useState<ExpertTagRow | null>(null);
  const [editName, setEditName] = useState('');
  const [linkedExperts, setLinkedExperts] = useState<TagExpertRow[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [draftTagsByExpert, setDraftTagsByExpert] = useState<Record<string, string[]>>({});

  const activeTags = useMemo(
    () => (data || []).filter((t) => t.status === 'active'),
    [data]
  );

  const loadLinkedExperts = async (tagId: string) => {
    setLinkedLoading(true);
    try {
      const experts = await api<TagExpertRow[]>(`/api/admin/expert-tags/${tagId}/experts`);
      setLinkedExperts(experts);
      setDraftTagsByExpert(
        Object.fromEntries(experts.map((expert) => [expert.id, [...expert.domainTags]]))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '加载关联专家失败');
      setLinkedExperts([]);
      setDraftTagsByExpert({});
    } finally {
      setLinkedLoading(false);
    }
  };

  useEffect(() => {
    if (!offlineTarget || (offlineTarget.expertCount ?? 0) === 0) {
      setLinkedExperts([]);
      setDraftTagsByExpert({});
      return;
    }
    void loadLinkedExperts(offlineTarget.id);
  }, [offlineTarget?.id, offlineTarget?.expertCount]);

  const createTag = async () => {
    const name = newName.trim();
    if (!name) {
      alert('请输入标签名称');
      return;
    }
    setBusy('create');
    try {
      await api('/api/admin/expert-tags', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      setNewName('');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    } finally {
      setBusy('');
    }
  };

  const runOffline = async () => {
    if (!offlineTarget) return;
    setBusy(offlineTarget.id);
    try {
      await api(`/api/admin/expert-tags/${offlineTarget.id}/offline`, { method: 'POST' });
      setOfflineTarget(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '下架失败');
    } finally {
      setBusy('');
    }
  };

  const runOnline = async (tag: ExpertTagRow) => {
    setBusy(tag.id);
    try {
      await api(`/api/admin/expert-tags/${tag.id}/online`, { method: 'POST' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '上架失败');
    } finally {
      setBusy('');
    }
  };

  const toggleExpertTag = (expertId: string, tagName: string, offlineName?: string) => {
    setDraftTagsByExpert((prev) => {
      const current = prev[expertId] || [];
      if (current.includes(tagName)) {
        const next = current.filter((t) => t !== tagName);
        return { ...prev, [expertId]: next };
      }
      const next = [...current, tagName];
      if (offlineName && tagName !== offlineName) {
        return { ...prev, [expertId]: next.filter((t) => t !== offlineName) };
      }
      return { ...prev, [expertId]: next };
    });
  };

  const saveExpertTags = async (expert: TagExpertRow) => {
    const draft = draftTagsByExpert[expert.id] || [];
    if (draft.length === 0) {
      alert('每位专家至少保留一个上架标签');
      return;
    }
    if (offlineTarget && draft.includes(offlineTarget.name)) {
      alert(`请取消「${offlineTarget.name}」或改选其他上架标签后再保存`);
      return;
    }
    setBusy(expert.id);
    try {
      await api(`/api/admin/experts/${expert.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ domainTags: draft })
      });
      const freshTags = await api<ExpertTagRow[]>('/api/admin/expert-tags');
      await reload();
      if (offlineTarget) {
        const updatedTag = freshTags.find((t) => t.id === offlineTarget.id);
        if (!updatedTag || (updatedTag.expertCount ?? 0) === 0) {
          setOfflineTarget(updatedTag || null);
          setLinkedExperts([]);
          return;
        }
        setOfflineTarget(updatedTag);
        const refreshed = await api<TagExpertRow[]>(
          `/api/admin/expert-tags/${offlineTarget.id}/experts`
        );
        setLinkedExperts(refreshed);
        setDraftTagsByExpert(
          Object.fromEntries(refreshed.map((row) => [row.id, [...row.domainTags]]))
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy('');
    }
  };

  const openOffline = (tag: ExpertTagRow) => {
    setOfflineTarget(tag);
  };

  const openEdit = (tag: ExpertTagRow) => {
    setEditTarget(tag);
    setEditName(tag.name);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) {
      alert('请输入标签名称');
      return;
    }
    if (name === editTarget.name) {
      setEditTarget(null);
      return;
    }
    setBusy(`edit-${editTarget.id}`);
    try {
      await api(`/api/admin/expert-tags/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name })
      });
      setEditTarget(null);
      setEditName('');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy('');
    }
  };

  const inputClass =
    'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';

  const linkedCount = offlineTarget?.expertCount ?? linkedExperts.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">专家标签管理</h1>
        <p className="text-xs text-slate-500 mt-1">
          上架标签用于前台展示与审核打标。无关联专家可直接下架；若仍有关联专家，需逐位调整其标签后再下架。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">新标签</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="如：电商零售"
            className={`${inputClass} w-48`}
          />
        </label>
        <button
          type="button"
          disabled={busy === 'create'}
          onClick={() => void createTag()}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {busy === 'create' ? '创建中…' : '添加标签'}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">标签名称</th>
              <th className="text-left p-3">状态</th>
              <th className="text-right p-3">关联专家</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((tag, index) => (
              <tr key={tag.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 tabular-nums">{(data?.length || 0) - index}</td>
                <td className="p-3 font-bold">{tag.name}</td>
                <td className="p-3">
                  {tag.status === 'active' ? (
                    <span className="text-emerald-700 font-bold">已上架</span>
                  ) : (
                    <span className="text-slate-400 font-bold">已下架</span>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums font-semibold text-slate-700">
                  {tag.expertCount ?? 0}
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => openEdit(tag)}
                    className="font-bold text-blue-600 cursor-pointer disabled:opacity-60"
                  >
                    编辑
                  </button>
                  {tag.status === 'active' ? (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => openOffline(tag)}
                      className="font-bold text-amber-700 cursor-pointer disabled:opacity-60"
                    >
                      下架
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === tag.id}
                      onClick={() => void runOnline(tag)}
                      className="font-bold text-emerald-700 cursor-pointer disabled:opacity-60"
                    >
                      上架
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && (data || []).length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无标签</p>
        )}
      </div>

      {editTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !busy && setEditTarget(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black">编辑标签名称</h3>
            <p className="text-xs text-slate-500">
              修改后将同步更新所有关联专家、申请记录中的该标签名称。
            </p>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-500">标签名称</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`${inputClass} w-full`}
                autoFocus
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setEditTarget(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void saveEdit()}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {busy === `edit-${editTarget.id}` ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {offlineTarget && linkedCount === 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOfflineTarget(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black">下架标签：{offlineTarget.name}</h3>
            <p className="text-xs text-slate-500">
              当前无专家使用该标签，确认后将从前台隐藏，且不可再用于审核打标。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOfflineTarget(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void runOffline()}
                className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {busy ? '处理中…' : '确认下架'}
              </button>
            </div>
          </div>
        </div>
      )}

      {offlineTarget && linkedCount > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOfflineTarget(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-black">暂无法下架：{offlineTarget.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                仍有 <span className="font-bold text-slate-800">{linkedCount}</span>{' '}
                位专家使用该标签。请逐位调整下方专家的标签（取消勾选「{offlineTarget.name}」并选择其他上架标签），全部迁出后再下架。
              </p>
            </div>

            {linkedLoading && <p className="text-xs text-slate-500">加载关联专家…</p>}

            <div className="space-y-3">
              {linkedExperts.map((expert) => {
                const draft = draftTagsByExpert[expert.id] || expert.domainTags;
                const stillUsesTarget = draft.includes(offlineTarget.name);
                const selectableTags = activeTags.filter((t) => t.id !== offlineTarget.id);
                return (
                  <div
                    key={expert.id}
                    className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{expert.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{expert.expertNo}</div>
                      </div>
                      {stillUsesTarget ? (
                        <span className="text-[11px] font-bold text-amber-700">待迁出</span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700">已迁出</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...selectableTags, { id: offlineTarget.id, name: offlineTarget.name }].map(
                        (tag) => {
                          const selected = draft.includes(tag.name);
                          const isTarget = tag.id === offlineTarget.id;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() =>
                                toggleExpertTag(
                                  expert.id,
                                  tag.name,
                                  isTarget ? undefined : offlineTarget.name
                                )
                              }
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                isTarget
                                  ? selected
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-white text-slate-400 border-slate-200 line-through'
                                  : selected
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {selected && !isTarget ? '✓ ' : ''}
                              {tag.name}
                              {isTarget && selected ? '（待移除）' : ''}
                            </button>
                          );
                        }
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={busy === expert.id || draft.length === 0}
                        onClick={() => void saveExpertTags(expert)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        {busy === expert.id ? '保存中…' : '保存该专家标签'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOfflineTarget(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
