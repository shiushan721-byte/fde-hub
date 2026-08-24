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
