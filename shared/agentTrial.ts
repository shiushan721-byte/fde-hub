const DAY_MS = 24 * 60 * 60 * 1000;

export type AgentTrialStatus = 'none' | 'active' | 'expired';

export type AgentTrialView = {
  status: AgentTrialStatus;
  startedAt: string | null;
  expiresAt: string | null;
  trialDays: number;
  remainingDays: number;
};

export function trialExpiresAt(startedAt: Date, trialDays: number) {
  return new Date(startedAt.getTime() + trialDays * DAY_MS);
}

export function describeTrial(startedAt: Date | null, trialDays: number, now = Date.now()): AgentTrialView {
  if (!startedAt || trialDays < 1) {
    return { status: 'none', startedAt: null, expiresAt: null, trialDays: 0, remainingDays: 0 };
  }
  const expires = trialExpiresAt(startedAt, trialDays);
  const remainingMs = expires.getTime() - now;
  if (remainingMs <= 0) {
    return {
      status: 'expired',
      startedAt: startedAt.toISOString(),
      expiresAt: expires.toISOString(),
      trialDays,
      remainingDays: 0
    };
  }
  return {
    status: 'active',
    startedAt: startedAt.toISOString(),
    expiresAt: expires.toISOString(),
    trialDays,
    remainingDays: Math.max(1, Math.ceil(remainingMs / DAY_MS))
  };
}
