import React, { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { SERVICE_SCOPE_FOOTER } from '../../shared/officialProductCatalog';

function useAdminQuery<T>(path: string) {
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
  }, [path]);

  return { data, error, loading, reload: load };
}

type OfficialProductRow = {
  id: string;
  title: string;
  description?: string;
  suggestedPrice: number;
  sortOrder: number;
  status: string;
};

const DESCRIPTION_PLACEHOLDER = [
  '服务说明',
  '',
  '服务包含',
  '- ',
  '',
  '交付内容',
  '',
  '不包含',
  '',
  SERVICE_SCOPE_FOOTER
].join('\n');

export const OfficialProductsPage = () => {
  const { data, error, loading, reload } = useAdminQuery<OfficialProductRow[]>('/api/admin/official-products');
  const [title, setTitle] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState(200);
  const [busy, setBusy] = useState('');
  const [editTarget, setEditTarget] = useState<OfficialProductRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState(0);

  const rows = useMemo(() => data || [], [data]);

  const createItem = async () => {
    if (!title.trim()) {
      alert('请填写商品名称');
      return;
    }
    setBusy('create');
    try {
      await api('/api/admin/official-products', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          suggestedPrice: Number(suggestedPrice) || 0
        })
      });
      setTitle('');
      setSuggestedPrice(200);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    } finally {
      setBusy('');
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editTitle.trim()) {
      alert('请填写商品名称');
      return;
    }
    setBusy(editTarget.id);
    try {
      await api(`/api/admin/official-products/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          suggestedPrice: Number(editPrice) || 0
        })
      });
      setEditTarget(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (row: OfficialProductRow, status: 'active' | 'offline') => {
    setBusy(row.id);
    try {
      await api(`/api/admin/official-products/${row.id}/${status === 'offline' ? 'offline' : 'online'}`, {
        method: 'POST'
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy('');
    }
  };

  const openEdit = (row: OfficialProductRow) => {
    setEditTarget(row);
    setEditTitle(row.title);
    setEditDescription(row.description || '');
    setEditPrice(row.suggestedPrice);
  };

  const inputClass = 'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">官方商品</h1>
        <p className="text-xs text-slate-500 mt-1">上架后会默认出现在每个智能体的定制项目里，成交价由创作者自行填写。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px_auto] gap-2 items-end">
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">商品名称</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：网页部署服务"
            className={`${inputClass} w-full`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">参考价格（元）</span>
          <input
            type="number"
            min={0}
            value={suggestedPrice}
            onChange={(e) => setSuggestedPrice(Number(e.target.value) || 0)}
            className={`${inputClass} w-full`}
          />
        </label>
        <button
          type="button"
          disabled={busy === 'create'}
          onClick={() => void createItem()}
          className="h-[38px] px-3 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {busy === 'create' ? '创建中…' : '添加商品'}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="text-left font-semibold px-4 py-2">名称</th>
              <th className="text-left font-semibold px-4 py-2 w-28">参考价格</th>
              <th className="text-left font-semibold px-4 py-2 w-24">状态</th>
              <th className="text-right font-semibold px-4 py-2 w-36">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold text-slate-900">{row.title}</td>
                <td className="px-4 py-3 text-slate-800">¥{row.suggestedPrice}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {row.status === 'active' ? '已上架' : '已下架'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    onClick={() => openEdit(row)}
                  >
                    编辑
                  </button>
                  {row.status === 'active' ? (
                    <button
                      type="button"
                      disabled={busy === row.id}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer disabled:opacity-60"
                      onClick={() => void setStatus(row, 'offline')}
                    >
                      下架
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === row.id}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer disabled:opacity-60"
                      onClick={() => void setStatus(row, 'active')}
                    >
                      上架
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  暂无官方商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-black">编辑官方商品</h2>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-500">名称</span>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-500">详情介绍</span>
              <textarea
                rows={12}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={DESCRIPTION_PLACEHOLDER}
                className={`${inputClass} w-full resize-y leading-relaxed`}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-500">参考价格（元）</span>
              <input
                type="number"
                min={0}
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value) || 0)}
                className={`${inputClass} w-full`}
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy === editTarget.id}
                onClick={() => void saveEdit()}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
