import { Router } from 'express';
import { z } from 'zod';
import { fail, ok } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import {
  bindPayoutAccount,
  getWalletOverview,
  requestWithdrawal,
  type PayChannel
} from '../services/wallet';

export const walletRouter = Router();
walletRouter.use(requireAuth);

walletRouter.get('/', async (req, res) => {
  try {
    const data = await getWalletOverview(req.user!.id);
    return ok(res, data);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '加载账户失败');
  }
});

const bindSchema = z.object({
  channel: z.literal('alipay'),
  account: z.string().min(2).max(64)
});

walletRouter.post('/payout-accounts', async (req, res) => {
  const parsed = bindSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请填写有效的支付宝收款账号');
  try {
    const wallet = await bindPayoutAccount({
      userId: req.user!.id,
      channel: parsed.data.channel as PayChannel,
      account: parsed.data.account
    });
    return ok(res, {
      alipayBound: wallet.alipayBound,
      alipayAccount: wallet.alipayAccount
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '绑定失败');
  }
});

const withdrawSchema = z.object({
  channel: z.literal('alipay').default('alipay'),
  amountYuan: z.number().positive().optional(),
  amountCents: z.number().int().positive().optional()
});

walletRouter.post('/withdraw', async (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '请选择提现方式和金额');
  const amountCents =
    parsed.data.amountCents ?? Math.round((parsed.data.amountYuan || 0) * 100);
  if (amountCents <= 0) return fail(res, '提现金额须大于 0');
  try {
    const withdraw = await requestWithdrawal({
      userId: req.user!.id,
      amountCents,
      channel: parsed.data.channel as PayChannel
    });
    const overview = await getWalletOverview(req.user!.id);
    return ok(res, { withdraw, wallet: overview });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : '提现失败');
  }
});
