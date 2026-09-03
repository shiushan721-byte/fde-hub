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

type ExpertTitleRow = {
  id: string;
  name: string;
  sortOrder: number;
  status: string;
  expertCount?: number;
};

type TitleExpertRow = {
  id: string;
  name: string;
  expertNo: string;
  title: string;
};

export const ExpertTitlesPage = () => {
  const { data, error, loading, reload } = useAdminQuery<ExpertTitleRow[]>('/api/admin/expert-titles');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState('');
  const [offlineTarget, setOfflineTarget] = useState<ExpertTitleRow | null>(null);
  const [editTarget, setEditTarget] = useState<ExpertTitleRow | null>(null);
  const [editName, setEditName] = useState('');
  const [linkedExperts, setLinkedExperts] = useState<TitleExpertRow[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [draftTitleByExpert, setDraftTitleByExpert] = useState<Record<string, string>>({});

  const activeTitles = useMemo(
    () => (data || []).filter((t) => t.status === 'active'),
    [data]
  );

  const loadLinkedExperts = async (titleId: string) => {
    setLinkedLoading(true);
    try {
      const experts = await api<TitleExpertRow[]>(`/api/admin/expert-titles/${titleId}/experts`);
      setLinkedExperts(experts);
      setDraftTitleByExpert(Object.fromEntries(experts.map((expert) => [expert.id, expert.title])));
    } catch (err) {
      alert(err instanceof Error ? err.message : '加载关联专家失败');
      setLinkedExperts([]);
      setDraftTitleByExpert({});
    } finally {
      setLinkedLoading(false);
    }
  };

  useEffect(() => {
    if (!offlineTarget || (offlineTarget.expertCount ?? 0) === 0) {
      setLinkedExperts([]);
      setDraftTitleByExpert({});
      return;
    }
    void loadLinkedExperts(offlineTarget.id);
  }, [offlineTarget?.id, offlineTarget?.expertCount]);

  const createTitle = async () => {
    const name = newName.trim();
    if (!name) {
      alert('请输入头衔名称');
      return;
    }
    setBusy('create');
    try {
      await api('/api/admin/expert-titles', {
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
      await api(`/api/admin/expert-titles/${offlineTarget.id}/offline`, { method: 'POST' });
      setOfflineTarget(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '下架失败');
    } finally {
      setBusy('');
    }
  };

  const runOnline = async (title: ExpertTitleRow) => {
    setBusy(title.id);
    try {
      await api(`/api/admin/expert-titles/${title.id}/online`, { method: 'POST' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '上架失败');
    } finally {
      setBusy('');
    }
  };

  const saveExpertTitle = async (expert: TitleExpertRow) => {
    const next = (draftTitleByExpert[expert.id] || '').trim();
    if (!next) {
      alert('请选择一个上架头衔');
      return;
    }
    if (offlineTarget && next === offlineTarget.name) {
      alert(`请改选其他上架头衔后再保存`);
      return;
    }
    setBusy(expert.id);
    try {
      await api(`/api/admin/experts/${expert.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: next })
      });
      const fresh = await api<ExpertTitleRow[]>('/api/admin/expert-titles');
      await reload();
      if (offlineTarget) {
        const updated = fresh.find((t) => t.id === offlineTarget.id);
        if (!updated || (updated.expertCount ?? 0) === 0) {
          setOfflineTarget(updated || null);
          setLinkedExperts([]);
          return;
        }
        setOfflineTarget(updated);
        const refreshed = await api<TitleExpertRow[]>(
          `/api/admin/expert-titles/${offlineTarget.id}/experts`
        );
        setLinkedExperts(refreshed);
        setDraftTitleByExpert(Object.fromEntries(refreshed.map((row) => [row.id, row.title])));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy('');
    }
  };

  const openOffline = (title: ExpertTitleRow) => {
    setOfflineTarget(title);
  };

  const openEdit = (title: ExpertTitleRow) => {
    setEditTarget(title);
    setEditName(title.name);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) {
      alert('请输入头衔名称');
      return;
    }
    if (name === editTarget.name) {
      setEditTarget(null);
      return;
    }
    setBusy(`edit-${editTarget.id}`);
    try {
      await api(`/api/admin/expert-titles/${editTarget.id}`, {
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

  const inputClass = 'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';
  const linkedCount = offlineTarget?.expertCount ?? linkedExperts.length;
  const migrateOptions = activeTitles.filter((t) => t.id !== offlineTarget?.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">专家头衔管理</h1>
        <p className="text-xs text-slate-500 mt-1">
          上架头衔会出现在专家卡片，并作为入驻审核时的下拉选项。无关联专家可直接下架；若仍有关联专家，需逐位改选其他上架头衔后再下架。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">新头衔</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="如：电商 AI 解决方案架构师"
            className={`${inputClass} w-72`}
          />
        </label>
        <button
          type="button"
          disabled={busy === 'create'}
          onClick={() => void createTitle()}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {busy === 'create' ? '创建中…' : '添加头衔'}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">头衔名称</th>
              <th className="text-left p-3">状态</th>
              <th className="text-right p-3">关联专家</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((title, index) => (
              <tr key={title.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 tabular-nums">{(data?.length || 0) - index}</td>
                <td className="p-3 font-bold">{title.name}</td>
                <td className="p-3">
                  {title.status === 'active' ? (
                    <span className="text-emerald-700 font-bold">已上架</span>
                  ) : (
                    <span className="text-slate-400 font-bold">已下架</span>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums font-semibold text-slate-700">
                  {title.expertCount ?? 0}
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => openEdit(title)}
                    className="font-bold text-blue-600 cursor-pointer disabled:opacity-60"
                  >
                    编辑
                  </button>
                  {title.status === 'active' ? (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => openOffline(title)}
                      className="font-bold text-amber-700 cursor-pointer disabled:opacity-60"
                    >
                      下架
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === title.id}
                      onClick={() => void runOnline(title)}
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
          <p className="p-6 text-sm text-slate-400 text-center">暂无头衔</p>
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
            <h3 className="text-sm font-black">编辑头衔名称</h3>
            <p className="text-xs text-slate-500">
              修改后将同步更新所有关联专家、申请记录中的该头衔名称。
            </p>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-500">头衔名称</span>
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
            <h3 className="text-sm font-black">下架头衔：{offlineTarget.name}</h3>
            <p className="text-xs text-slate-500">
              当前无专家使用该头衔，确认后将从前台隐藏，且不可再用于入驻审核选择。
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
                位专家使用该头衔。请逐位改选其他上架头衔，全部迁出后再下架。
              </p>
              {migrateOptions.length === 0 && (
                <p className="text-xs text-rose-600 mt-2">请先添加并上架其他头衔，才能迁出当前头衔。</p>
              )}
            </div>

            {linkedLoading && <p className="text-xs text-slate-500">加载关联专家…</p>}

            <div className="space-y-3">
              {linkedExperts.map((expert) => {
                const draft = draftTitleByExpert[expert.id] || expert.title;
                const stillUsesTarget = draft === offlineTarget.name;
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
                    <select
                      value={draft}
                      onChange={(e) =>
                        setDraftTitleByExpert((prev) => ({ ...prev, [expert.id]: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value={offlineTarget.name}>{offlineTarget.name}（当前，待移除）</option>
                      {migrateOptions.map((title) => (
                        <option key={title.id} value={title.name}>
                          {title.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={busy === expert.id || stillUsesTarget || migrateOptions.length === 0}
                        onClick={() => void saveExpertTitle(expert)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        {busy === expert.id ? '保存中…' : '保存该专家头衔'}
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
