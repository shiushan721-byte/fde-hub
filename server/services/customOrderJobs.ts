import { prisma } from '../lib/prisma';
import { parseJson, toJson } from '../lib/json';
import {
  acceptDeliveryByBuyer,
  newId,
  settleOrder
} from './customOrder';

const DAY_MS = 24 * 60 * 60 * 1000;

async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  payload?: unknown;
}) {
  await prisma.userNotification.create({
    data: {
      id: newId('ntf'),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body || '',
      link: input.link || '',
      payload: toJson(input.payload ?? {})
    }
  });
}

async function writeOrderEvent(input: {
  orderId: string;
  actorId?: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  payload?: unknown;
}) {
  await prisma.customOrderEvent.create({
    data: {
      id: newId('oevt'),
      orderId: input.orderId,
      actorId: input.actorId,
      eventType: input.eventType,
      fromStatus: input.fromStatus || '',
      toStatus: input.toStatus || '',
      reason: input.reason || '',
      payload: toJson(input.payload ?? {})
    }
  });
}

/** 待支付超时自动关闭（默认确认方案后 72h） */
export async function closeExpiredUnpaidOrders(now = new Date()) {
  const expired = await prisma.customOrder.findMany({
    where: {
      status: 'awaiting_payment',
      paymentDeadlineAt: { lt: now }
    }
  });

  let closed = 0;
  for (const order of expired) {
    await prisma.customOrder.update({
      where: { id: order.id },
      data: {
        status: 'closed',
        paymentStatus: order.paymentStatus === 'pending' ? 'expired' : order.paymentStatus,
        closedAt: now,
        closeReason: 'payment_timeout'
      }
    });
    await writeOrderEvent({
      orderId: order.id,
      eventType: 'payment_timeout_closed',
      fromStatus: 'awaiting_payment',
      toStatus: 'closed',
      reason: '超过付款截止时间未支付，订单自动关闭',
      payload: { paymentDeadlineAt: order.paymentDeadlineAt?.toISOString() }
    });
    await notify({
      userId: order.buyerUserId,
      type: 'order_closed_payment_timeout',
      title: '订单已因超时未付款关闭',
      body: `${order.orderNo} · 创作者无需交付`,
      link: `/orders?orderId=${order.id}`,
      payload: { orderId: order.id }
    });
    if (order.creatorUserId) {
      await notify({
        userId: order.creatorUserId,
        type: 'order_closed_payment_timeout',
        title: '用户超时未付款，订单已关闭',
        body: order.orderNo,
        link: `/creator-center?tab=orders&orderId=${order.id}`,
        payload: { orderId: order.id }
      });
    }
    closed += 1;
  }

  return { closed };
}

/**
 * 验收提醒：推送成功后第 1 / 5 / 7 天前发送。
 * day7 = 验收截止前约 12 小时，避免用户不知道。
 */
export async function sendAcceptanceReminders(now = new Date()) {
  const orders = await prisma.customOrder.findMany({
    where: {
      status: 'pending_acceptance',
      disputeStatus: 'none',
      acceptanceStartedAt: { not: null },
      acceptanceDeadlineAt: { not: null }
    }
  });

  let sent = 0;
  for (const order of orders) {
    if (!order.acceptanceStartedAt || !order.acceptanceDeadlineAt) continue;
    const started = order.acceptanceStartedAt.getTime();
    const deadline = order.acceptanceDeadlineAt.getTime();
    const elapsed = now.getTime() - started;
    const remaining = deadline - now.getTime();
    const sentFlags = parseJson<string[]>(order.acceptanceRemindersSent, []);

    const due: Array<{ key: string; title: string; body: string }> = [];
    if (elapsed >= 1 * DAY_MS && !sentFlags.includes('day1')) {
      due.push({
        key: 'day1',
        title: '验收提醒 · 专属智能体已送达第 1 天',
        body: `${order.orderNo} 请尽快试用并确认验收；截止 ${order.acceptanceDeadlineAt.toLocaleString('zh-CN')}`
      });
    }
    if (elapsed >= 5 * DAY_MS && !sentFlags.includes('day5')) {
      due.push({
        key: 'day5',
        title: '验收提醒 · 还剩约 2 天',
        body: `${order.orderNo} 若无异议，到期将自动验收并进入结算`
      });
    }
    if (remaining <= 12 * 60 * 60 * 1000 && remaining > 0 && !sentFlags.includes('day7')) {
      due.push({
        key: 'day7',
        title: '验收提醒 · 即将自动验收',
        body: `${order.orderNo} 将在约 12 小时内自动验收，如有问题请尽快申请修改或发起争议`
      });
    }

    if (!due.length) continue;

    const nextFlags = [...sentFlags];
    for (const item of due) {
      nextFlags.push(item.key);
      await notify({
        userId: order.buyerUserId,
        type: `acceptance_reminder_${item.key}`,
        title: item.title,
        body: item.body,
        link: `/orders?orderId=${order.id}`,
        payload: { orderId: order.id, reminder: item.key }
      });
      if (order.creatorUserId) {
        await notify({
          userId: order.creatorUserId,
          type: `acceptance_reminder_${item.key}`,
          title: `客户验收提醒已发送（${item.key}）`,
          body: order.orderNo,
          link: `/creator-center?tab=orders&orderId=${order.id}`,
          payload: { orderId: order.id, reminder: item.key }
        });
      }
      await writeOrderEvent({
        orderId: order.id,
        eventType: `acceptance_reminder_${item.key}`,
        fromStatus: 'pending_acceptance',
        toStatus: 'pending_acceptance',
        payload: { reminder: item.key }
      });
      sent += 1;
    }

    await prisma.customOrder.update({
      where: { id: order.id },
      data: { acceptanceRemindersSent: toJson(nextFlags) }
    });
  }

  return { sent };
}

/**
 * 七天无异议自动验收：
 * - 已推送且处于待验收
 * - 无争议 / 未申请修改
 * - 验收截止已过
 */
export async function autoAcceptExpiredOrders(now = new Date()) {
  const orders = await prisma.customOrder.findMany({
    where: {
      status: 'pending_acceptance',
      disputeStatus: 'none',
      acceptanceDeadlineAt: { lt: now }
    },
    include: {
      instance: true
    }
  });

  let accepted = 0;
  for (const order of orders) {
    if (order.instance && !['active', 'revision'].includes(order.instance.status)) {
      continue;
    }
    try {
      await acceptDeliveryByBuyer({
        orderId: order.id,
        buyerUserId: order.buyerUserId,
        feedback: '系统七天无异议自动验收',
        source: 'system_auto'
      });
      await notify({
        userId: order.buyerUserId,
        type: 'order_auto_accepted',
        title: '订单已自动验收',
        body: `${order.orderNo} · 七天验收期结束且无异议`,
        link: `/orders?orderId=${order.id}`,
        payload: { orderId: order.id }
      });
      accepted += 1;
    } catch (err) {
      console.warn('[jobs] autoAccept failed', order.id, err);
    }
  }

  return { accepted };
}

/** 验收后满 24h 进入可提现结算（争议中不结算） */
export async function settleEligibleOrders(now = new Date()) {
  const orders = await prisma.customOrder.findMany({
    where: {
      status: 'pending_settlement',
      settlementStatus: 'pending_settlement',
      disputeStatus: { not: 'open' },
      OR: [
        { settlementEligibleAt: { lte: now } },
        { settlementEligibleAt: null, updatedAt: { lte: new Date(now.getTime() - DAY_MS) } }
      ]
    }
  });

  let settled = 0;
  for (const order of orders) {
    try {
      await settleOrder(order.id, 'system');
      settled += 1;
    } catch (err) {
      console.warn('[jobs] settle failed', order.id, err);
    }
  }

  return { settled };
}

export async function runCustomOrderJobs(now = new Date()) {
  const unpaid = await closeExpiredUnpaidOrders(now);
  const reminders = await sendAcceptanceReminders(now);
  const autoAccepted = await autoAcceptExpiredOrders(now);
  const settled = await settleEligibleOrders(now);
  return {
    at: now.toISOString(),
    unpaidClosed: unpaid.closed,
    remindersSent: reminders.sent,
    autoAccepted: autoAccepted.accepted,
    settled: settled.settled
  };
}

let timer: ReturnType<typeof setInterval> | null = null;

/** 启动进程内定时任务（默认每 5 分钟） */
export function startCustomOrderJobScheduler(intervalMs = 5 * 60 * 1000) {
  if (timer) return;
  const tick = () => {
    runCustomOrderJobs().then(
      (result) => {
        if (
          result.unpaidClosed ||
          result.remindersSent ||
          result.autoAccepted ||
          result.settled
        ) {
          console.log('[custom-order-jobs]', result);
        }
      },
      (err) => console.error('[custom-order-jobs] failed', err)
    );
  };
  // 启动后稍晚跑一次，再按间隔执行
  setTimeout(tick, 8_000);
  timer = setInterval(tick, intervalMs);
  console.log(`[custom-order-jobs] scheduler started (every ${Math.round(intervalMs / 1000)}s)`);
}
