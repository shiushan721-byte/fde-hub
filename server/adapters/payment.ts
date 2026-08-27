export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PayChannel = 'wechat' | 'alipay';

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
  channel?: PayChannel;
}

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  channel?: PayChannel;
}

export interface RefundInput {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface PaymentAdapter {
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  queryPayment(paymentId: string): Promise<PaymentStatus>;
  /** 模拟支付渠道回调：确认到账 */
  confirmPaid(paymentId: string): Promise<PaymentStatus>;
  refundPayment(input: RefundInput): Promise<{ paymentId: string; status: PaymentStatus }>;
}

const paidIds = new Set<string>();

/** 开发环境托管支付：创建后待支付，confirmPaid 模拟平台到账 */
export const stubPaymentAdapter: PaymentAdapter = {
  async createPayment(input) {
    const channel = input.channel || 'wechat';
    const paymentId = `pay_${channel}_${input.orderId}_${Date.now()}`;
    return {
      paymentId,
      status: 'pending',
      channel,
      checkoutUrl: `/mock-checkout/${channel}/${paymentId}`
    };
  },
  async queryPayment(paymentId) {
    return paidIds.has(paymentId) ? 'paid' : 'pending';
  },
  async confirmPaid(paymentId) {
    paidIds.add(paymentId);
    return 'paid';
  },
  async refundPayment(input) {
    paidIds.delete(input.paymentId);
    return { paymentId: input.paymentId, status: 'refunded' };
  }
};
