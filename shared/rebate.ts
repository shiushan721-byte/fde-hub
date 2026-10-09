/**
 * 返点金额（厘，1 元 = 1000）＝ 消费（分）× 万分比。
 * 精确到小数点后三位，只要还有余数就进一位，不舍去。
 */
export function rebateCentsFrom(amountCents: number, rateBps: number) {
  const negative = amountCents < 0;
  const amount = Math.abs(Math.round(amountCents));
  const rate = Math.max(0, Math.round(rateBps));
  if (amount === 0 || rate === 0) return 0;
  const product = amount * 10 * rate;
  const quotient = Math.floor(product / 10000);
  const milli = product % 10000 === 0 ? quotient : quotient + 1;
  return negative ? -milli : milli;
}

export function yuanFromRebateMilli(milli: number) {
  const negative = milli < 0;
  const abs = Math.abs(Math.round(milli));
  const text = `${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, '0')}`;
  return negative ? `-¥${text}` : `¥${text}`;
}

export function ratePercentLabel(rateBps: number) {
  const percent = rateBps / 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2)}%`;
}

export function yuanFromCents(cents: number) {
  const sign = cents < 0 ? '-' : '';
  return `${sign}¥${(Math.abs(cents) / 100).toFixed(2)}`;
}

export type RebateRateScope = 'platform' | 'expert' | 'agent';

export type RebateRateRow = {
  scope: RebateRateScope | string;
  expertId: string;
  agentId: string;
  modelId: string;
  rateBps: number;
  effectiveFrom: string | Date;
  status?: string;
};

/** 已上架、按词元计费的模型。返点设置只能从这里选择。 */
export const LISTED_TOKEN_MODELS = [
  { id: 'qwen-3.8', name: 'Qwen 3.8' },
  { id: 'qwen-3.5', name: 'Qwen 3.5' },
  { id: 'qwen-3-max', name: 'Qwen 3 Max' },
  { id: 'deepseek-4.1', name: 'DeepSeek 4.1' },
  { id: 'deepseek-v3', name: 'DeepSeek V3' },
  { id: 'deepseek-r1', name: 'DeepSeek R1' },
  { id: 'glm-5', name: 'GLM-5' },
  { id: 'glm-4.6', name: 'GLM-4.6' },
  { id: 'kimi-k2', name: 'Kimi K2' },
  { id: 'minimax-m2', name: 'MiniMax M2' },
  { id: 'doubao-pro', name: '豆包 Pro' },
  { id: 'doubao-lite', name: '豆包 Lite' },
  { id: 'hunyuan-turbo', name: '混元 Turbo' },
  { id: 'ernie-4.5', name: '文心 4.5' },
  { id: 'spark-4', name: '讯飞星火 4.0' },
  { id: 'step-2', name: '阶跃 Step-2' },
  { id: 'yi-lightning', name: '零一万物 Yi Lightning' },
  { id: 'claude-sonnet', name: 'Claude Sonnet' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
] as const;

export function tokenModelName(modelId: string) {
  return LISTED_TOKEN_MODELS.find((model) => model.id === modelId)?.name || modelId;
}

/** 智能体专属 → FDE 专属 → 平台默认。只取生效时间不晚于消费时间的最新一条。 */
export function resolveRebateRate(
  rates: RebateRateRow[],
  input: { agentId: string; expertId: string; modelId: string; at: Date }
) {
  const at = input.at.getTime();
  const pick = (scope: RebateRateScope, match: (row: RebateRateRow) => boolean) => {
    const hits = rates
      .filter((row) => row.status !== 'paused' && row.scope === scope && row.modelId === input.modelId && match(row))
      .filter((row) => new Date(row.effectiveFrom).getTime() <= at)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    return hits[0] || null;
  };
  return (
    pick('agent', (row) => row.agentId === input.agentId) ||
    pick('expert', (row) => row.expertId === input.expertId) ||
    pick('platform', () => true)
  );
}
