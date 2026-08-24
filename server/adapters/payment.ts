export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
}

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
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
    const paymentId = `pay_stub_${input.orderId}_${Date.now()}`;
    return {
      paymentId,
      status: 'pending',
      checkoutUrl: `/mock-checkout/${paymentId}`
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
