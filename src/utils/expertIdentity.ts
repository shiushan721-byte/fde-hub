import { UserIdentityRole } from '../types/creator';

/** @deprecated 已取消专家分级 */
export const EXPERT_TIER_LABEL = {
  1: 'AI 专家',
  2: 'AI 专家',
  3: 'AI 专家'
} as const;

/** 平台仅两类主体：普通用户 / AI 专家 */
export function isExpertRole(role: UserIdentityRole | string | undefined | null): boolean {
  return Boolean(role && role !== 'normal');
}

export function normalizeUserRole(role: UserIdentityRole): 'normal' | 'expert' {
  return role === 'normal' ? 'normal' : 'expert';
}

export function expertBadgeClass(): string {
  return 'bg-blue-100 text-blue-800 border-blue-200';
}

export function expertCenterNavLabel(): string {
  return 'AI专家';
}
