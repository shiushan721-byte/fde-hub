import React, { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { standardServiceSummary } from '../../shared/officialProductCatalog';

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

  return { data, error, loading };
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN');
}

type CustomProductRow = {
  id: string;
  title: string;
  description?: string;
  price: number;
  source?: 'official' | 'custom';
  agentId: string;
  agentTitle: string;
  creatorId: string;
  creatorName: string;
  creatorPhone: string;
  createdAt: string | null;
};

export const CustomProductsPage = () => {
  const { data, error, loading } = useAdminQuery<CustomProductRow[]>('/api/admin/custom-products');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const list = data || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      `${item.title} ${item.agentTitle} ${item.agentId} ${item.creatorName} ${item.creatorPhone}`
        .toLowerCase()
        .includes(q)
    );
  }, [data, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">自定义商品</h1>
        <p className="text-xs text-slate-500 mt-1">
          创作者智能体上的定制项目（含保留的官方商品）。此处只读，不支持后台改价或删除。
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索名称、智能体、编号、创作者或手机号"
        className="h-9 w-full max-w-sm rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400"
      />

      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="text-left font-semibold px-4 py-2 w-14">序号</th>
              <th className="text-left font-semibold px-4 py-2">名称 / 详情介绍</th>
              <th className="text-left font-semibold px-4 py-2">价格</th>
              <th className="text-left font-semibold px-4 py-2">所属智能体</th>
              <th className="text-left font-semibold px-4 py-2">创作者</th>
              <th className="text-left font-semibold px-4 py-2 whitespace-nowrap">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-500 tabular-nums">{rows.length - index}</td>
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{row.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 truncate max-w-md">
                    {standardServiceSummary(row.description || '') || '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-800">¥{row.price}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-800">{row.agentTitle}</div>
                  <code className="mt-0.5 block text-[11px] font-mono text-slate-500 break-all">{row.agentId}</code>
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-800">{row.creatorName}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-500">{row.creatorPhone || '—'}</div>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatTime(row.createdAt)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  暂无自定义商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
