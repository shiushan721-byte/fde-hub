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
        返回 AI 专家中心
      </button>

      <header className="pt-10 pb-16">
        <p className="text-sm text-slate-500">智能体使用返点计划</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 leading-tight">
          让你的智能体，带来持续的使用收益
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600">
          按 Skill 接入规范重新优化智能体后，用户使用按词元计费的模型产生的消费会被识别。返点比例按模型分别配置，例如 Qwen 3.8 为 10%，DeepSeek 4.1 为 5%。
        </p>
        <div className="mt-8">
          <button type="button" disabled={busy === 'spec'} onClick={() => void openSpec()} className={primaryBtn}>
            下载 Skill 接入规范
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-500">先下载规范，再按规范改智能体。示例比例只说明算法。实际参与活动的模型及返点比例以官方公布为准。返点比例可能调整，HelloMe 保留调整权利。</p>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </header>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">用户使用你的智能体，你获得词元模型返点</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          返点只计算按词元计费的模型消费。每个模型有自己的返点比例，消费按当时生效的比例计入对应智能体和 FDE。
        </p>
        <ul className="mt-8 space-y-4">
          {[
            ['按模型返点', '例如 Qwen 3.8 为 10%，DeepSeek 4.1 为 5%。实际参与活动的模型及返点比例以官方公布为准。返点比例可能调整，HelloMe 保留调整权利。'],
            ['归属清楚', '消费关联到对应的智能体、模型和 FDE。'],
            ['收益看得见', '在 AI 专家中心查看用户使用情况、各模型消费和返点明细。']
          ].map(([title, copy]) => (
            <li key={title}>
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-14 border-t border-slate-200">
        <p className="text-base leading-7 text-slate-600">
          返点比例跟模型走。下面是说明用的例子。实际参与活动的模型及返点比例以官方公布为准。返点比例可能调整，HelloMe 保留调整权利。
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left font-medium px-4 py-3">模型</th>
                <th className="text-left font-medium px-4 py-3">返点比例</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-4 text-slate-800">Qwen 3.8</td>
                <td className="px-4 py-4 text-slate-600">10%</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-4 text-slate-800">DeepSeek 4.1</td>
                <td className="px-4 py-4 text-slate-600">5%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          示例只说明不同模型可以有不同比例。未按词元计费的模型不计入返点。
        </p>
      </section>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">先按规范优化，使用才会被识别并返点</h2>
        <ol className="mt-8 space-y-6">
          {[
            ['下载 Skill 接入规范', '规范说明智能体如何接入，以及词元模型的使用如何被记录。'],
            ['按规范重新优化智能体', '改造完成后，按词元计费的模型使用才会被识别，并按该模型的比例返点。'],
            ['查看使用与收益', '在收益管理里按模型查看消费和对应返点。']
          ].map(([title, copy], index) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold text-slate-400">{index + 1}</span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" disabled={busy === 'spec'} onClick={() => void openSpec()} className={`${primaryBtn} mt-8`}>
          下载 Skill 接入规范
        </button>
      </section>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">消费归属明确，返点计算透明</h2>
        <p className="mt-5 text-lg text-slate-950">返点金额＝该模型的词元消费金额 × 该模型的返点比例</p>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          例如：Qwen 3.8 产生 ¥100 词元消费，比例 10%，返点 ¥10。同一笔若走 DeepSeek 4.1、比例 5%，返点 ¥5。
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          以上仅为计算示例，实际参与活动的模型及返点比例以官方公布为准。返点比例可能调整，HelloMe 保留调整权利。
        </p>
      </section>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">随时了解智能体的使用表现</h2>
        <p className="mt-4 text-sm text-slate-600">在 AI 专家中心，你可以查看：</p>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700 list-disc pl-5">
          <li>哪些用户使用了你的智能体。</li>
          <li>按词元计费的各模型用量和消费金额。</li>
          <li>每个模型当时适用的返点比例。</li>
          <li>对应返点。</li>
        </ul>
        <p className="mt-4 text-sm leading-6 text-slate-500">消费和返点按时间段汇总展示。</p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <p className="px-4 py-2 text-xs text-slate-400 bg-slate-50">示意图 · 不是真实收入</p>
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left font-medium px-4 py-2">时间段</th>
                <th className="text-left font-medium px-4 py-2">智能体</th>
                <th className="text-left font-medium px-4 py-2">模型</th>
                <th className="text-right font-medium px-4 py-2">词元消费</th>
                <th className="text-right font-medium px-4 py-2">比例</th>
                <th className="text-right font-medium px-4 py-2">返点</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 text-slate-700">
                <td className="px-4 py-3">本月</td>
                <td className="px-4 py-3">示例智能体</td>
                <td className="px-4 py-3">Qwen 3.8</td>
                <td className="px-4 py-3 text-right">¥100</td>
                <td className="px-4 py-3 text-right">10%</td>
                <td className="px-4 py-3 text-right">¥10</td>
              </tr>
              <tr className="border-t border-slate-100 text-slate-700">
                <td className="px-4 py-3">本月</td>
                <td className="px-4 py-3">示例智能体</td>
                <td className="px-4 py-3">DeepSeek 4.1</td>
                <td className="px-4 py-3 text-right">¥100</td>
                <td className="px-4 py-3 text-right">5%</td>
                <td className="px-4 py-3 text-right">¥5</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-500">使用记录和返点收入在 AI 专家中心的页签里查看。</p>
      </section>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">常见问题</h2>
        <dl className="mt-8 space-y-6">
          {[
            ['哪些模型能返点？', '只有按词元计费的模型。返点按该模型当时配置的比例计算。'],
            ['每个模型的比例一样吗？', '不一样。例如 Qwen 3.8 可以是 10%，DeepSeek 4.1 可以是 5%。实际参与活动的模型及返点比例以官方公布为准。返点比例可能调整，HelloMe 保留调整权利。'],
            ['已有智能体可以参加吗？', '可以。按 Skill 接入规范重新优化后，词元模型的使用就会被识别并计算返点。'],
            ['下载规范之后就能返点吗？', '下载之后，还要按规范改智能体。改好之后，按词元计费的模型消费才会被识别并计算返点。']
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="text-sm font-semibold text-slate-950">{q}</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-600">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">让更多人用上你的智能体，让每一次有效使用积累价值</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          下载规范，按规范优化智能体。之后每一次被识别的词元模型使用，都会按该模型的比例积累返点。
        </p>
        <div className="mt-8">
          <button type="button" disabled={busy === 'spec'} onClick={() => void openSpec()} className={primaryBtn}>
            下载 Skill 接入规范
          </button>
        </div>
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
