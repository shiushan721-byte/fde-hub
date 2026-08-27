import { prisma } from '../lib/prisma';
import type { PayChannel } from './wallet';
import { newWalletId } from './wallet';

export async function createPendingPayment(input: {
  orderId: string;
  userId: string;
  amountCents: number;
  channel: PayChannel;
  currency?: string;
}) {
  const existing = await prisma.paymentRecord.findFirst({
    where: { orderId: input.orderId, status: 'pending', channel: input.channel },
    orderBy: { createdAt: 'desc' }
  });
  if (existing) return existing;

  return prisma.paymentRecord.create({
    data: {
      id: newWalletId('pay'),
      orderId: input.orderId,
      userId: input.userId,
      channel: input.channel,
      amountCents: input.amountCents,
      currency: input.currency || 'CNY',
      status: 'pending',
      checkoutCode: `HM-${input.channel.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    }
  });
}

export async function markPaymentPaid(paymentId: string) {
  const payment = await prisma.paymentRecord.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error('支付单不存在');
  if (payment.status === 'paid') return payment;
  return prisma.paymentRecord.update({
    where: { id: paymentId },
    data: { status: 'paid', paidAt: new Date() }
  });
}
