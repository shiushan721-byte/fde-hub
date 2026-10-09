import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ratePercentLabel, yuanFromCents, yuanFromRebateMilli } from '../../shared/rebate';

type Campaign = {
  expertName: string;
  enrollment: { status: string; enrolledAt: string; specDownloadedAt: string | null } | null;
  agents: Array<{
    agentId: string;
    title: string;
    status: string;
    qualifiedAt: string | null;
  }>;
  rates: Array<{
    modelId: string;
    expertRateBps: number | null;
    expertScope: string | null;
    effectiveFrom: string | null;
    agents: Array<{ agentId: string; scope: string; rateBps: number; effectiveFrom: string }>;
  }>;
};

type UsageRow = {
  userName: string;
  userId: string;
  agentTitle: string;
  modelId: string;
  channel: string;
  lastUsedAt: string;
  runCount: number;
  tokens: number;
  amountCents: number;
  rebateCents: number;
};

type Income = {
  totalCents: number;
  currentCents: number;
  pendingCents: number;
  settledCents: number;
  currentPeriod: string;
  details: Array<{
    day?: string;
    userName: string;
    agentTitle: string;
    modelId: string;
    amountCents: number;
    rateBps: number;
    rebateCents: number;
  }>;
  adjustments: Array<{ id: string; amountCents: number; reason: string; createdAt: string }>;
  settlements: Array<{ id: string; period: string; amountCents: number; createdAt: string }>;
};

function localDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function today() {
  return localDate(new Date());
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}

function yesterday() {
  return daysAgo(1);
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const RebateCampaignPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const openSpec = async () => {
    setBusy('spec');
    setError('');
    try {
      const res = await fetch('/api/me/rebate/spec', { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || '下载失败');
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = 'hellome-rebate-skill-spec.md';
      link.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : '下载失败');
    } finally {
      setBusy('');
    }
  };

  const primaryBtn = 'h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold cursor-pointer disabled:opacity-60';

  return (
    <article className="pb-16">
      <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 cursor-pointer">
        返回创作者空间
      </button>

      <header className="pt-10 pb-14">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 leading-tight">
          你的智能体被使用，你就有收益
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600">
          按接入规范优化智能体后，用户使用产生的符合活动规则的词元消费，将按对应模型的比例为你累计返点。
        </p>
      </header>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">如何参与</h2>
        <p className="mt-4 text-base leading-7 text-slate-700">
          下载接入规范 → 按规范优化智能体 → 在创作者空间查看使用与返点明细
        </p>
        <button type="button" disabled={busy === 'spec'} onClick={() => void openSpec()} className={`${primaryBtn} mt-8`}>
          下载接入规范
        </button>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </section>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">返点怎么算？</h2>
        <p className="mt-5 text-lg text-slate-950">返点金额 = 有效词元消费金额 × 对应模型返点比例</p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left font-medium px-4 py-3">模型示例</th>
                <th className="text-left font-medium px-4 py-3">返点比例</th>
                <th className="text-right font-medium px-4 py-3">有效消费 ¥100 可获返点</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-4 text-slate-800">Qwen 3.8</td>
                <td className="px-4 py-4 text-slate-600">10%</td>
                <td className="px-4 py-4 text-right text-slate-800">¥10</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-4 text-slate-800">DeepSeek 4.1</td>
                <td className="px-4 py-4 text-slate-600">5%</td>
                <td className="px-4 py-4 text-right text-slate-800">¥5</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          仅计入符合活动规则的词元消费，未按规范接入的智能体暂不计入。
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          以上仅为计算示例，参与模型及返点比例以官方公布为准。HelloMe 保留调整返点比例的权利。
        </p>
      </section>
    </article>
  );
};

export const RebateDeskPanel: React.FC<{ mode: 'usage' | 'income' }> = ({ mode }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [income, setIncome] = useState<Income | null>(null);
  const [from, setFrom] = useState(mode === 'income' ? yesterday() : daysAgo(21));
  const [to, setTo] = useState(mode === 'income' ? yesterday() : today());
  const [agentId, setAgentId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void api<Campaign>('/api/me/rebate/campaign').then(setCampaign).catch(() => undefined);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams({
      from: new Date(`${from}T00:00:00`).toISOString(),
      to: new Date(`${to}T23:59:59`).toISOString(),
      ...(agentId ? { agentId } : {}),
      ...(mode === 'usage' ? { channel: 'official' } : {})
    });
    const load = mode === 'usage'
      ? api<UsageRow[]>(`/api/me/rebate/usage?${query}`).then(setUsage)
      : api<Income>(`/api/me/rebate/income?${query}`).then(setIncome);
    void load.catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, [mode, from, to, agentId]);

  const incomeRows = (income?.details || []).filter((row) => {
    const query = keyword.trim().toLowerCase();
    if (!query) return true;
    return [row.userName, row.agentTitle, row.modelId, row.day]
      .some((value) => (value || '').toLowerCase().includes(query));
  });

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {mode === 'usage' && (
        <div className="flex flex-wrap gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 text-xs" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 text-xs" />
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 text-xs">
            <option value="">全部智能体</option>
            {(campaign?.agents || []).map((agent) => (
              <option key={agent.agentId} value={agent.agentId}>{agent.title}</option>
            ))}
          </select>
        </div>
      )}
      {mode === 'income' && (
        <div className="flex flex-wrap gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="开始日期" className="h-8 px-2 rounded-lg border border-slate-200 text-xs" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="结束日期" className="h-8 px-2 rounded-lg border border-slate-200 text-xs" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索用户、智能体或模型"
            className="h-8 w-52 px-2 rounded-lg border border-slate-200 text-xs"
          />
        </div>
      )}
      {mode === 'usage' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium w-14">序号</th>
                <th className="text-left p-3 font-medium">用户</th>
                <th className="text-left p-3 font-medium">智能体</th>
                <th className="text-left p-3 font-medium">最近使用</th>
                <th className="text-left p-3 font-medium">模型</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = new Map<string, UsageRow>();
                for (const row of usage) {
                  if (row.channel === 'self') continue;
                  const key = `${row.userId}|${row.agentTitle}|${row.modelId}`;
                  const prev = rows.get(key);
                  if (!prev || row.lastUsedAt > prev.lastUsedAt) rows.set(key, row);
                }
                const list = [...rows.values()].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
                return list.map((row, index) => (
                  <tr key={`${row.userId}-${row.agentTitle}-${row.modelId}`} className="border-t border-slate-100">
                    <td className="p-3">{list.length - index}</td>
                    <td className="p-3">{row.userName}</td>
                    <td className="p-3">{row.agentTitle}</td>
                    <td className="p-3 whitespace-nowrap">{formatTime(row.lastUsedAt)}</td>
                    <td className="p-3">{row.modelId || '—'}</td>
                  </tr>
                ));
              })()}
              {usage.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">这段时间没有使用记录。</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium w-14">序号</th>
                <th className="text-left p-3 font-medium">日期</th>
                <th className="text-left p-3 font-medium">用户</th>
                <th className="text-left p-3 font-medium">智能体</th>
                <th className="text-left p-3 font-medium">模型</th>
                <th className="text-right p-3 font-medium">官方消费</th>
                <th className="text-right p-3 font-medium">模型返点比例</th>
                <th className="text-right p-3 font-medium">返点</th>
              </tr>
            </thead>
            <tbody>
              {incomeRows.map((row, index) => (
                <tr key={`${row.day}-${row.userName}-${row.agentTitle}-${row.modelId}-${row.rateBps}`} className="border-t border-slate-100">
                  <td className="p-3 tabular-nums text-slate-400">{incomeRows.length - index}</td>
                  <td className="p-3 whitespace-nowrap">{row.day || yesterday()}</td>
                  <td className="p-3">{row.userName}</td>
                  <td className="p-3">{row.agentTitle}</td>
                  <td className="p-3">{row.modelId}</td>
                  <td className="p-3 text-right">{yuanFromCents(row.amountCents)}</td>
                  <td className="p-3 text-right">{ratePercentLabel(row.rateBps)}</td>
                  <td className="p-3 text-right">{yuanFromRebateMilli(row.rebateCents)}</td>
                </tr>
              ))}
              {incomeRows.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-400">没有符合条件的返点记录。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
