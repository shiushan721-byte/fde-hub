import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';

const BUYER_ID = 'user-demo';
const CREATOR_ID = 'user-fde-linran';
const EXPERT_ID = 'fde-linran';
const OPS_ID = 'user-ops';

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function sampleProposal(input: {
  baseAgentId: string;
  baseAgentTitle: string;
  title: string;
  priceCents: number;
  deliveryDays: number;
  serviceScope: string;
  quoteNote?: string;
  version?: number;
}) {
  const items = input.serviceScope
    ? input.serviceScope.split(/[+＋、,，；;]/).map((s) => s.trim()).filter(Boolean)
    : [input.title];
  return toJson({
    baseAgentId: input.baseAgentId,
    baseAgentTitle: input.baseAgentTitle,
    baseAgentVersion: 'v1.0.0',
    customizationItems: items.length ? items : [input.title],
    excludedItems: ['不含历史数据迁移', '不含第三方账号采购费用'],
    deliverables: ['客户专属智能体 v1.0', '部署文档与使用说明'],
    priceCents: input.priceCents,
    deliveryDays: input.deliveryDays,
    freeRevisionCount: 2,
    acceptanceCriteria: '按需求清单逐项验收，核心流程可正常使用',
    afterSalePeriodDays: 30,
    needsCustomerData: false,
    needsThirdPartyAccess: true,
    thirdPartyNote: '需客户提供 ERP / 钉钉测试账号',
    note: input.quoteNote || '',
    submittedAt: new Date().toISOString(),
    version: input.version ?? 1
  });
}

type DemoOrderSpec = {
  id: string;
  orderNo: string;
  status: string;
  title: string;
  baseAgentId: string;
  baseAgentTitle: string;
  priceCents: number;
  deliveryDays: number;
  serviceScope: string;
  quoteNote?: string;
  paymentStatus?: string;
  paymentId?: string;
  paidAt?: Date;
  escrowedAt?: Date;
  quotedAt?: Date;
  proposalSubmittedAt?: Date;
  proposalConfirmedAt?: Date;
  proposalVersion?: number;
  withProposal?: boolean;
  acceptanceDeadlineAt?: Date;
  acceptanceStartedAt?: Date;
  settlementStatus?: string;
  platformFeeCents?: number;
  creatorPayoutCents?: number;
  settledAt?: Date;
  revisionsUsed?: number;
  daysAgo: number;
  instance?: {
    id: string;
    status: string;
    currentVersion?: string;
    publishedAt?: Date;
  };
  delivery?: {
    id: string;
    version: string;
    status: string;
    changelog: string;
    rejectReason?: string;
    publishedAt?: Date;
  };
};

const DEMO_ORDERS: DemoOrderSpec[] = [
  {
    id: 'cord_demo_pending_quote',
    orderNo: 'CUS-DEMO-001',
    status: 'consulting',
    title: '电商客服 · 接入企业微信',
    baseAgentId: 'hz-canvas',
    baseAgentTitle: 'Hz Canvas无限画布',
    priceCents: 0,
    deliveryDays: 14,
    serviceScope: '',
    daysAgo: 1
  },
  {
    id: 'cord_demo_pending_quote_2',
    orderNo: 'CUS-DEMO-009',
    status: 'consulting',
    title: '文书工坊 · 请示模板定制',
    baseAgentId: 'doc-emergency',
    baseAgentTitle: '救急文书工坊',
    priceCents: 0,
    deliveryDays: 7,
    serviceScope: '',
    daysAgo: 0
  },
  {
    id: 'cord_demo_awaiting_proposal',
    orderNo: 'CUS-DEMO-012',
    status: 'awaiting_proposal_confirm',
    title: '客服助手 · 多店铺工单聚合',
    baseAgentId: 'ecommerce-ai-cs',
    baseAgentTitle: '电商全渠道客服自愈智能体',
    priceCents: 359900,
    deliveryDays: 10,
    serviceScope: '多店铺工单聚合 + 钉钉通知 + 2 次修改',
    quoteNote: '含 Shopify / 聚水潭双端联调',
    quotedAt: daysFromNow(-1),
    proposalSubmittedAt: daysFromNow(-1),
    proposalVersion: 1,
    withProposal: true,
    daysAgo: 2
  },
  {
    id: 'cord_demo_awaiting_pay',
    orderNo: 'CUS-DEMO-002',
    status: 'awaiting_payment',
    title: '售后工单看板定制',
    baseAgentId: 'ecommerce-ai-cs',
    baseAgentTitle: '电商全渠道客服自愈智能体',
    priceCents: 888800,
    deliveryDays: 12,
    serviceScope: '页面定制 + ERP 对接 + 2 次修改',
    quoteNote: '含聚水潭 Webhook 联调',
    quotedAt: daysFromNow(-2),
    proposalConfirmedAt: daysFromNow(-1),
    proposalSubmittedAt: daysFromNow(-2),
    proposalVersion: 1,
    withProposal: true,
    daysAgo: 3
  },
  {
    id: 'cord_demo_awaiting_pay_2',
    orderNo: 'CUS-DEMO-010',
    status: 'awaiting_payment',
    title: 'PDF 工具 · 批量盖章流程',
    baseAgentId: 'pdf-tools',
    baseAgentTitle: '轻量PDF小工具',
    priceCents: 128800,
    deliveryDays: 5,
    serviceScope: '流程页 + 一次修改',
    quoteNote: '已确认方案，待买家付款托管',
    quotedAt: daysFromNow(-1),
    proposalConfirmedAt: daysFromNow(0),
    proposalSubmittedAt: daysFromNow(-1),
    proposalVersion: 1,
    withProposal: true,
    daysAgo: 2
  },
  {
    id: 'cord_demo_escrowed',
    orderNo: 'CUS-DEMO-003',
    status: 'paid_pending_start',
    title: '门店团购售后流程改造',
    baseAgentId: 'agent-ecommerce-service',
    baseAgentTitle: '电商全渠道智能客服与售后自愈助手',
    priceCents: 459900,
    deliveryDays: 10,
    serviceScope: '流程改造 + 一次验收内修改',
    quoteNote: '平台已托管，待开工',
    quotedAt: daysFromNow(-4),
    proposalSubmittedAt: daysFromNow(-4),
    proposalConfirmedAt: daysFromNow(-3),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'escrowed',
    paymentId: 'pay_stub_cord_demo_escrowed',
    paidAt: daysFromNow(-1),
    escrowedAt: daysFromNow(-1),
    daysAgo: 5
  },
  {
    id: 'cord_demo_in_dev',
    orderNo: 'CUS-DEMO-004',
    status: 'in_development',
    title: 'GEO 助手 · 品牌可见度看板',
    baseAgentId: 'geo-helper',
    baseAgentTitle: 'GEO助手',
    priceCents: 329900,
    deliveryDays: 14,
    serviceScope: 'Prompt 定制 + 页面二开',
    quoteNote: '开发中',
    quotedAt: daysFromNow(-8),
    proposalSubmittedAt: daysFromNow(-8),
    proposalConfirmedAt: daysFromNow(-7),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'escrowed',
    paymentId: 'pay_stub_cord_demo_in_dev',
    paidAt: daysFromNow(-6),
    escrowedAt: daysFromNow(-6),
    daysAgo: 9,
    instance: { id: 'inst_demo_in_dev', status: 'draft', currentVersion: '' }
  },
  {
    id: 'cord_demo_in_review',
    orderNo: 'CUS-DEMO-005',
    status: 'in_review',
    title: '物流拦截与改址自动化',
    baseAgentId: 'ecommerce-ai-cs',
    baseAgentTitle: '电商全渠道客服自愈智能体',
    priceCents: 199900,
    deliveryDays: 10,
    serviceScope: 'page+flow',
    quotedAt: daysFromNow(-12),
    proposalSubmittedAt: daysFromNow(-12),
    proposalConfirmedAt: daysFromNow(-11),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'escrowed',
    paymentId: 'pay_stub_cord_demo_in_review',
    paidAt: daysFromNow(-10),
    escrowedAt: daysFromNow(-10),
    daysAgo: 14,
    instance: { id: 'inst_demo_in_review', status: 'in_review', currentVersion: '' },
    delivery: {
      id: 'deliv_demo_in_review',
      version: 'v1.0.0',
      status: 'pending_ops_review',
      changelog: '已完成改址流程与 WMS 联调，Hermes 校验通过'
    }
  },
  {
    id: 'cord_demo_revision',
    orderNo: 'CUS-DEMO-006',
    status: 'revision',
    title: '退换货话术与工单分流',
    baseAgentId: 'ecommerce-ai-cs',
    baseAgentTitle: '电商全渠道客服自愈智能体',
    priceCents: 259900,
    deliveryDays: 12,
    serviceScope: '话术库 + 工单路由',
    quotedAt: daysFromNow(-16),
    proposalSubmittedAt: daysFromNow(-16),
    proposalConfirmedAt: daysFromNow(-15),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'escrowed',
    paymentId: 'pay_stub_cord_demo_revision',
    paidAt: daysFromNow(-14),
    escrowedAt: daysFromNow(-14),
    revisionsUsed: 1,
    daysAgo: 18,
    instance: { id: 'inst_demo_revision', status: 'revision', currentVersion: '' },
    delivery: {
      id: 'deliv_demo_revision',
      version: 'v0.9.0',
      status: 'ops_rejected',
      changelog: '首版交付',
      rejectReason: '退换货分支未覆盖「七天无理由+已拆封」场景，请补充'
    }
  },
  {
    id: 'cord_demo_pending_accept',
    orderNo: 'CUS-DEMO-007',
    status: 'pending_acceptance',
    title: '大促峰值分流策略定制',
    baseAgentId: 'geo-helper',
    baseAgentTitle: 'GEO助手',
    priceCents: 599900,
    deliveryDays: 15,
    serviceScope: '峰值预案 + 监控看板',
    quotedAt: daysFromNow(-20),
    proposalSubmittedAt: daysFromNow(-20),
    proposalConfirmedAt: daysFromNow(-19),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'escrowed',
    paymentId: 'pay_stub_cord_demo_pending_accept',
    paidAt: daysFromNow(-18),
    escrowedAt: daysFromNow(-18),
    acceptanceStartedAt: daysFromNow(-2),
    acceptanceDeadlineAt: daysFromNow(5),
    daysAgo: 22,
    instance: {
      id: 'inst_demo_pending_accept',
      status: 'active',
      currentVersion: 'v1.0.0',
      publishedAt: daysFromNow(-2)
    },
    delivery: {
      id: 'deliv_demo_pending_accept',
      version: 'v1.0.0',
      status: 'published_to_customer',
      changelog: '已推送客户验收',
      publishedAt: daysFromNow(-2)
    }
  },
  {
    id: 'cord_demo_pending_settlement',
    orderNo: 'CUS-DEMO-013',
    status: 'pending_settlement',
    title: '会员标签自动化营销',
    baseAgentId: 'hz-canvas',
    baseAgentTitle: 'Hz Canvas无限画布',
    priceCents: 219900,
    deliveryDays: 10,
    serviceScope: '标签规则 + 触达流程',
    quotedAt: daysFromNow(-25),
    proposalSubmittedAt: daysFromNow(-25),
    proposalConfirmedAt: daysFromNow(-24),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'escrowed',
    paymentId: 'pay_stub_cord_demo_pending_settlement',
    paidAt: daysFromNow(-22),
    escrowedAt: daysFromNow(-22),
    acceptanceStartedAt: daysFromNow(-8),
    settlementStatus: 'pending_settlement',
    daysAgo: 26,
    instance: {
      id: 'inst_demo_pending_settlement',
      status: 'active',
      currentVersion: 'v1.0.0',
      publishedAt: daysFromNow(-8)
    },
    delivery: {
      id: 'deliv_demo_pending_settlement',
      version: 'v1.0.0',
      status: 'published_to_customer',
      changelog: '客户已验收，待结算',
      publishedAt: daysFromNow(-8)
    }
  },
  {
    id: 'cord_demo_completed',
    orderNo: 'CUS-DEMO-008',
    status: 'completed',
    title: '会员积分查询插件',
    baseAgentId: 'hz-canvas',
    baseAgentTitle: 'Hz Canvas无限画布',
    priceCents: 149900,
    deliveryDays: 7,
    serviceScope: 'API 对接 + 验收',
    quotedAt: daysFromNow(-30),
    proposalSubmittedAt: daysFromNow(-30),
    proposalConfirmedAt: daysFromNow(-29),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'settled',
    paymentId: 'pay_stub_cord_demo_completed',
    paidAt: daysFromNow(-28),
    escrowedAt: daysFromNow(-28),
    settlementStatus: 'settled',
    platformFeeCents: 14990,
    creatorPayoutCents: 134910,
    settledAt: daysFromNow(-24),
    daysAgo: 32,
    instance: {
      id: 'inst_demo_completed',
      status: 'active',
      currentVersion: 'v1.0.0',
      publishedAt: daysFromNow(-25)
    },
    delivery: {
      id: 'deliv_demo_completed',
      version: 'v1.0.0',
      status: 'published_to_customer',
      changelog: '客户已验收，订单完成',
      publishedAt: daysFromNow(-25)
    }
  },
  {
    id: 'cord_demo_completed_2',
    orderNo: 'CUS-DEMO-011',
    status: 'completed',
    title: '图片压缩助手 · 批量规格导出',
    baseAgentId: 'img-compress',
    baseAgentTitle: '图片压缩小工具',
    priceCents: 99800,
    deliveryDays: 5,
    serviceScope: '批量导出 + 验收',
    quotedAt: daysFromNow(-40),
    proposalSubmittedAt: daysFromNow(-40),
    proposalConfirmedAt: daysFromNow(-39),
    proposalVersion: 1,
    withProposal: true,
    paymentStatus: 'settled',
    paymentId: 'pay_stub_cord_demo_completed_2',
    paidAt: daysFromNow(-38),
    escrowedAt: daysFromNow(-38),
    settlementStatus: 'settled',
    platformFeeCents: 9980,
    creatorPayoutCents: 89820,
    settledAt: daysFromNow(-34),
    daysAgo: 42,
    instance: {
      id: 'inst_demo_completed_2',
      status: 'active',
      currentVersion: 'v1.1.0',
      publishedAt: daysFromNow(-35)
    },
    delivery: {
      id: 'deliv_demo_completed_2',
      version: 'v1.1.0',
      status: 'published_to_customer',
      changelog: '已完成并验收',
      publishedAt: daysFromNow(-35)
    }
  }
];

async function upsertDemoOrder(spec: DemoOrderSpec) {
  const createdAt = daysFromNow(-spec.daysAgo);
  const customizationSpec = toJson({
    need: spec.title,
    pages: ['工作台', '流程页'],
    source: 'seed'
  });
  const deliveryProposal =
    spec.withProposal && spec.priceCents > 0
      ? sampleProposal({
          baseAgentId: spec.baseAgentId,
          baseAgentTitle: spec.baseAgentTitle,
          title: spec.title,
          priceCents: spec.priceCents,
          deliveryDays: spec.deliveryDays,
          serviceScope: spec.serviceScope,
          quoteNote: spec.quoteNote,
          version: spec.proposalVersion ?? 1
        })
      : toJson({});

  await prisma.customOrder.upsert({
    where: { id: spec.id },
    create: {
      id: spec.id,
      orderNo: spec.orderNo,
      status: spec.status,
      buyerUserId: BUYER_ID,
      creatorUserId: CREATOR_ID,
      expertId: EXPERT_ID,
      baseAgentId: spec.baseAgentId,
      baseAgentTitle: spec.baseAgentTitle,
      baseAgentVersion: 'v1.0.0',
      title: spec.title,
      customizationSpec,
      priceCents: spec.priceCents,
      deliveryDays: spec.deliveryDays,
      serviceScope: spec.serviceScope,
      quoteNote: spec.quoteNote || '',
      deliveryProposal,
      proposalVersion: spec.proposalVersion || 0,
      proposalSubmittedAt: spec.proposalSubmittedAt || null,
      proposalConfirmedAt: spec.proposalConfirmedAt || null,
      quotedAt: spec.quotedAt || null,
      paymentId: spec.paymentId || '',
      paymentStatus: spec.paymentStatus || 'none',
      paidAt: spec.paidAt || null,
      escrowedAt: spec.escrowedAt || null,
      acceptanceStartedAt: spec.acceptanceStartedAt || null,
      acceptanceDeadlineAt: spec.acceptanceDeadlineAt || null,
      revisionQuota: 2,
      revisionsUsed: spec.revisionsUsed || 0,
      settlementStatus: spec.settlementStatus || '',
      platformFeeCents: spec.platformFeeCents || 0,
      creatorPayoutCents: spec.creatorPayoutCents || 0,
      settledAt: spec.settledAt || null,
      instanceId: spec.instance?.id || null,
      currentDeliveryId: spec.delivery?.id || null,
      createdAt,
      updatedAt: new Date()
    },
    update: {
      status: spec.status,
      priceCents: spec.priceCents,
      deliveryDays: spec.deliveryDays,
      serviceScope: spec.serviceScope,
      quoteNote: spec.quoteNote || '',
      deliveryProposal,
      proposalVersion: spec.proposalVersion || 0,
      proposalSubmittedAt: spec.proposalSubmittedAt || null,
      proposalConfirmedAt: spec.proposalConfirmedAt || null,
      quotedAt: spec.quotedAt || null,
      paymentId: spec.paymentId || '',
      paymentStatus: spec.paymentStatus || 'none',
      paidAt: spec.paidAt || null,
      escrowedAt: spec.escrowedAt || null,
      acceptanceStartedAt: spec.acceptanceStartedAt || null,
      acceptanceDeadlineAt: spec.acceptanceDeadlineAt || null,
      revisionsUsed: spec.revisionsUsed || 0,
      settlementStatus: spec.settlementStatus || '',
      platformFeeCents: spec.platformFeeCents || 0,
      creatorPayoutCents: spec.creatorPayoutCents || 0,
      settledAt: spec.settledAt || null,
      instanceId: spec.instance?.id || null,
      currentDeliveryId: spec.delivery?.id || null,
      updatedAt: new Date()
    }
  });

  if (spec.instance) {
    await prisma.privateAgentInstance.upsert({
      where: { id: spec.instance.id },
      create: {
        id: spec.instance.id,
        orderId: spec.id,
        customerUserId: BUYER_ID,
        creatorUserId: CREATOR_ID,
        expertId: EXPERT_ID,
        baseAgentId: spec.baseAgentId,
        baseAgentTitle: spec.baseAgentTitle,
        baseAgentVersion: 'v1.0.0',
        title: `${spec.baseAgentTitle} · 客户专属`,
        currentVersion: spec.instance.currentVersion || '',
        status: spec.instance.status,
        visibility: 'customer_only',
        customizationSpec,
        publishedAt: spec.instance.publishedAt || null,
        createdAt,
        updatedAt: new Date()
      },
      update: {
        status: spec.instance.status,
        currentVersion: spec.instance.currentVersion || '',
        publishedAt: spec.instance.publishedAt || null,
        updatedAt: new Date()
      }
    });
  }

  if (spec.instance && spec.delivery) {
    await prisma.deliveryVersion.upsert({
      where: { id: spec.delivery.id },
      create: {
        id: spec.delivery.id,
        orderId: spec.id,
        instanceId: spec.instance.id,
        version: spec.delivery.version,
        status: spec.delivery.status,
        changelog: spec.delivery.changelog,
        completedItems: toJson(['页面定制', '流程改造']),
        skillPayload: toJson({ skillFileName: 'customer_fork.zip' }),
        hermesReport: toJson({ passed: true, issues: [] }),
        hermesPassed: true,
        hermesCheckedAt: daysFromNow(-spec.daysAgo + 2),
        submittedAt: daysFromNow(-spec.daysAgo + 2),
        reviewerId:
          spec.delivery.status === 'ops_rejected' || spec.delivery.status === 'published_to_customer'
            ? OPS_ID
            : null,
        reviewedAt:
          spec.delivery.status === 'ops_rejected' || spec.delivery.status === 'published_to_customer'
            ? daysFromNow(-spec.daysAgo + 1)
            : null,
        rejectReason: spec.delivery.rejectReason || '',
        publishedAt: spec.delivery.publishedAt || null,
        createdAt: daysFromNow(-spec.daysAgo + 2),
        updatedAt: new Date()
      },
      update: {
        status: spec.delivery.status,
        changelog: spec.delivery.changelog,
        rejectReason: spec.delivery.rejectReason || '',
        publishedAt: spec.delivery.publishedAt || null,
        updatedAt: new Date()
      }
    });
  }

  const eventId = `oevt_${spec.id}`;
  await prisma.customOrderEvent.upsert({
    where: { id: eventId },
    create: {
      id: eventId,
      orderId: spec.id,
      actorId: CREATOR_ID,
      eventType: 'seed_demo_order',
      fromStatus: '',
      toStatus: spec.status,
      reason: '演示数据',
      payload: toJson({ seed: true }),
      createdAt
    },
    update: {
      toStatus: spec.status
    }
  });
}

/** 为创作者中心补齐全状态定制订单演示数据（幂等 upsert） */
export async function ensureSampleCustomOrders() {
  const buyer = await prisma.user.findUnique({ where: { id: BUYER_ID } });
  const creator = await prisma.user.findUnique({ where: { id: CREATOR_ID } });
  if (!buyer || !creator) return { upserted: 0, skipped: true };

  const agent = await prisma.agent.findFirst({ where: { status: 'published' } });
  if (!agent) return { upserted: 0, skipped: true };

  for (const spec of DEMO_ORDERS) {
    const exists = await prisma.agent.findUnique({ where: { id: spec.baseAgentId } });
    if (!exists) {
      spec.baseAgentId = agent.id;
      spec.baseAgentTitle = agent.title;
    }
    await upsertDemoOrder(spec);
    if (!spec.instance) {
      await prisma.deliveryVersion.deleteMany({ where: { orderId: spec.id } });
      await prisma.privateAgentInstance.deleteMany({ where: { orderId: spec.id } });
      await prisma.customOrder.update({
        where: { id: spec.id },
        data: { instanceId: null, currentDeliveryId: null }
      });
    }
  }

  return { upserted: DEMO_ORDERS.length, skipped: false };
}

const isDirect = process.argv[1]?.includes('seedCustomOrders');
if (isDirect) {
  ensureSampleCustomOrders()
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
