import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { LISTED_TOKEN_MODELS, ratePercentLabel, tokenModelName, yuanFromCents, yuanFromRebateMilli } from '../../shared/rebate';

type AdminData = {
  enrollments: Array<{ expertId: string; status: string; expert: { name: string }; specDownloadedAt: string | null }>;
  accesses: Array<{ agentId: string; expertId: string; status: string; qualifiedAt: string | null; agent: { title: string } }>;
  rates: Array<{ id: string; scope: string; expertId: string; agentId: string; modelId: string; rateBps: number; effectiveFrom: string; status: string }>;
  usages: Array<{ day: string; userId: string; userName: string; userPhone: string; expertId: string; expertName: string; expertPhone: string; agentId: string; agentTitle: string; modelId: string; rateBps: number; amountCents: number; rebateCents: number }>;
  settlements: Array<{ id: string; expertId: string; period: string; amountCents: number }>;
};

const fieldClass = 'h-9 w-full px-3 rounded-xl border border-slate-200 text-sm';

function matchesPerson(query: string, name: string, phone: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const digits = text.replace(/\D/g, '');
  if (name.toLowerCase().includes(text)) return true;
  return digits.length > 0 && phone.replace(/\D/g, '').includes(digits);
}

function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

type RateRow = AdminData['rates'][number];

function localDateTimeValue(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}T${hour}:${minute}`;
}

function formatEffective(iso: string) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}`;
}

export const RebateSettingsPage = () => {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<'create' | RateRow | null>(null);
  const [modelId, setModelId] = useState('');
  const [ratePercent, setRatePercent] = useState('10');
  const [effectiveFrom, setEffectiveFrom] = useState(localDateTimeValue);

  const load = async () => {
    setData(await api<AdminData>('/api/admin/rebate'));
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, []);

  const takenModelIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of data?.rates || []) {
      if (row.status !== 'paused') ids.add(row.modelId);
    }
    return ids;
  }, [data]);

  const openCreate = () => {
    const first = LISTED_TOKEN_MODELS.find((model) => !takenModelIds.has(model.id));
    setModelId(first?.id || '');
    setRatePercent('10');
    setEffectiveFrom(localDateTimeValue());
    setError('');
    setEditor('create');
  };

  const openEdit = (row: RateRow) => {
    setModelId(row.modelId);
    setRatePercent(String(row.rateBps / 100));
    setEffectiveFrom(localDateTimeValue(new Date(row.effectiveFrom)));
    setError('');
    setEditor(row);
  };

  const saveRate = async () => {
    setSaving(true);
    setError('');
    try {
      if (editor && editor !== 'create') {
        await api(`/api/admin/rebate/rates/${editor.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ratePercent: Number(ratePercent),
            effectiveFrom: new Date(effectiveFrom).toISOString()
          })
        });
      } else {
        await api('/api/admin/rebate/rates', {
          method: 'POST',
          body: JSON.stringify({
            scope: 'platform',
            modelId,
            ratePercent: Number(ratePercent),
            effectiveFrom: new Date(effectiveFrom).toISOString()
          })
        });
      }
      setEditor(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (row: RateRow, status: 'active' | 'paused') => {
    setError('');
    try {
      await api(`/api/admin/rebate/rates/${row.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  const editing = editor && editor !== 'create' ? editor : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-black">返点设置</h1>
        <button type="button" onClick={openCreate} className="h-9 shrink-0 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">
          增加模型返点
        </button>
      </div>
      {error && !editor && <p className="text-sm text-rose-600">{error}</p>}
      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-black mb-3">已配置的比例</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[24%]" />
              <col className="w-[14%]" />
              <col className="w-[22%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="text-slate-400 text-xs">
              <tr className="border-b border-slate-100">
                <th className="text-left font-medium px-3 py-2">序号</th>
                <th className="text-left font-medium px-3 py-2">模型</th>
                <th className="text-left font-medium px-3 py-2">返点比例</th>
                <th className="text-left font-medium px-3 py-2">生效时间</th>
                <th className="text-left font-medium px-3 py-2">状态</th>
                <th className="text-right font-medium px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rates || []).map((row, index) => {
                const paused = row.status === 'paused';
                return (
                  <tr key={row.id} className={`border-t border-slate-100 ${paused ? 'text-slate-400' : 'text-slate-800'}`}>
                    <td className="px-3 py-3">{(data?.rates.length || 0) - index}</td>
                    <td className="px-3 py-3">{tokenModelName(row.modelId)}</td>
                    <td className="px-3 py-3">{ratePercentLabel(row.rateBps)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatEffective(row.effectiveFrom)}</td>
                    <td className="px-3 py-3">{paused ? '已停用' : '生效中'}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => openEdit(row)} className="text-slate-900 font-medium cursor-pointer">编辑</button>
                      {paused ? (
                        <button type="button" onClick={() => void setStatus(row, 'active')} className="ml-3 text-slate-900 font-medium cursor-pointer">启用</button>
                      ) : (
                        <button type="button" onClick={() => void setStatus(row, 'paused')} className="ml-3 text-rose-600 font-medium cursor-pointer">停用</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(data?.rates || []).length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">还没有模型返点比例。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {editor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !saving && setEditor(null)}>
          <form
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-4"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void saveRate();
            }}
          >
            <h3 className="text-sm font-black">{editing ? '编辑模型返点' : '增加模型返点'}</h3>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">模型</span>
              {editing ? (
                <input value={tokenModelName(editing.modelId)} className={`${fieldClass} bg-slate-50 text-slate-500`} disabled />
              ) : (
                <select value={modelId} onChange={(e) => setModelId(e.target.value)} className={fieldClass} required>
                  {LISTED_TOKEN_MODELS.map((model) => {
                    const taken = takenModelIds.has(model.id);
                    return (
                      <option key={model.id} value={model.id} disabled={taken}>
                        {taken ? `${model.name}（已设置）` : model.name}
                      </option>
                    );
                  })}
                </select>
              )}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">返点比例（%）</span>
              <input value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} inputMode="decimal" className={fieldClass} required />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">生效时间</span>
              <input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={fieldClass} required />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setEditor(null)} className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                取消
              </button>
              <button type="submit" disabled={saving || (!editing && !modelId)} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const RebateActivityPage = () => {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [from, setFrom] = useState(yesterday);
  const [to, setTo] = useState(yesterday);
  const [expertKeyword, setExpertKeyword] = useState('');
  const [userKeyword, setUserKeyword] = useState('');
  const [modelId, setModelId] = useState('');

  useEffect(() => {
    void api<AdminData>('/api/admin/rebate')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, []);

  const rows = data?.usages || [];
  const models = [...new Set(rows.map((row) => row.modelId))];
  const visible = rows.filter((row) => {
    if (from && row.day < from) return false;
    if (to && row.day > to) return false;
    if (modelId && row.modelId !== modelId) return false;
    if (!matchesPerson(expertKeyword, row.expertName, row.expertPhone)) return false;
    if (!matchesPerson(userKeyword, row.userName, row.userPhone)) return false;
    return true;
  });
  const totalAmount = visible.reduce((sum, row) => sum + row.amountCents, 0);
  const totalRebate = visible.reduce((sum, row) => sum + row.rebateCents, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">返点记录</h1>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 text-xs" aria-label="开始日期" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 text-xs" aria-label="结束日期" />
        <input
          value={expertKeyword}
          onChange={(e) => setExpertKeyword(e.target.value)}
          placeholder="搜索 FDE"
          className="h-8 w-44 px-2 rounded-lg border border-slate-200 text-xs"
        />
        <input
          value={userKeyword}
          onChange={(e) => setUserKeyword(e.target.value)}
          placeholder="搜索用户"
          className="h-8 w-44 px-2 rounded-lg border border-slate-200 text-xs"
        />
        <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 text-xs">
          <option value="">全部模型</option>
          {models.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">总消费</div>
          <div className="mt-1 text-xl font-black tabular-nums text-slate-900">{yuanFromCents(totalAmount)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">总返点</div>
          <div className="mt-1 text-xl font-black tabular-nums text-slate-900">{yuanFromRebateMilli(totalRebate)}</div>
        </div>
      </div>
      <section className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left p-3 font-medium">序号</th>
              <th className="text-left p-3 font-medium">日期</th>
              <th className="text-left p-3 font-medium">使用用户</th>
              <th className="text-left p-3 font-medium">FDE</th>
              <th className="text-left p-3 font-medium">智能体</th>
              <th className="text-left p-3 font-medium">模型</th>
              <th className="text-right p-3 font-medium">返点比例</th>
              <th className="text-right p-3 font-medium">消费</th>
              <th className="text-right p-3 font-medium">返点</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={`${row.day}-${row.userId}-${row.expertId}-${row.agentId}-${row.modelId}-${row.rateBps}`} className="border-t border-slate-100">
                <td className="p-3">{visible.length - index}</td>
                <td className="p-3 whitespace-nowrap">{row.day}</td>
                <td className="p-3">
                  <div>{row.userName || '—'}</div>
                  <div className="mt-0.5 text-slate-400">{row.userPhone || '—'}</div>
                </td>
                <td className="p-3">
                  <div>{row.expertName}</div>
                  <div className="mt-0.5 text-slate-400">{row.expertPhone || '—'}</div>
                </td>
                <td className="p-3">{row.agentTitle}</td>
                <td className="p-3">{row.modelId}</td>
                <td className="p-3 text-right">{ratePercentLabel(row.rateBps)}</td>
                <td className="p-3 text-right">{yuanFromCents(row.amountCents)}</td>
                <td className="p-3 text-right">{yuanFromRebateMilli(row.rebateCents)}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-slate-400">没有符合筛选的返点记录。</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};
