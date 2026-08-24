import { Router } from 'express';
import { fail } from '../lib/http';

/** 旧公开申请接口已废弃：禁止按姓名/手机号查询，申请须登录后走 /api/me */
export const expertApplicationRouter = Router();

expertApplicationRouter.all('*', (_req, res) => {
  return fail(
    res,
    '请登录后使用 /api/me/expert-applications；已不再支持按姓名或手机号查询申请',
    410,
    'GONE'
  );
});
