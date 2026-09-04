import { api, ApiError } from './api';

export type MarketplaceUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

/** 确保前台申请流程有登录会话；优先已有会话，否则登录演示用户 */
export async function ensureMarketplaceSession(): Promise<MarketplaceUser> {
  try {
    return await api<MarketplaceUser>('/api/auth/me');
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) {
      // 非未登录错误时仍尝试演示登录
    }
  }
  return api<MarketplaceUser>('/api/auth/demo-user', { method: 'POST' });
}

/** 切到该智能体作者的专家会话，便于作者精选/隐藏用户成果 */
export async function ensureAgentAuthorSession(authorId?: string | null) {
  if (!authorId) return null;
  const email = `${authorId}@experts.hellome.art`;
  try {
    const me = await api<MarketplaceUser>('/api/auth/me');
    if (me.email === email || me.id === `user-${authorId}` || me.id === authorId) {
      return me;
    }
  } catch {
    /* 再尝试作者登录 */
  }
  try {
    return await api<MarketplaceUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'hellome-expert' })
    });
  } catch {
    return null;
  }
}
