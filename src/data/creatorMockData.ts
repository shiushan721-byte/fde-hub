import {
  CreatorTierLevel,
  CreatorTierInfo,
  CreatorAgentItem,
  CustomerLeadItem,
  CreatorServiceOrder,
  CreatorWalletDetail,
  CreatorDisputeItem
} from '../types/creator';

export const mockCreatorTierTiers: Record<CreatorTierLevel, CreatorTierInfo> = {
  1: {
    level: 1,
    title: '一级 AI 专家',
    badge: '一级 AI 专家',
    badgeColor: 'blue',
    description: '真人实名且至少发布 1 个经 Hermes 校验可稳定运行的免费智能体，享有官方智库收录与基础词元返点。',
    privileges: [
      '入驻 AI 专家公开集合页展示',
      '接收来自平台表单的商业咨询线索',
      '享有智能体 10% 有效词元消耗返点',
      '公开分享个人专属主页与作品集'
    ],
    requirements: ['实名认证成功', '已发布可运行智能体 ≥ 1', '账号无严重违规 (系统自动审核)'],
    tokenRebateRate: 0.1,
    standardRevenueShare: 0.7,
    serviceRevenueShare: 0.85
  },
  2: {
    level: 2,
    title: '二级 AI 专家',
    badge: '二级 AI 专家',
    badgeColor: 'indigo',
    description: '具备稳定使用量与良好用户反馈，Hermes 执行成功率高，享有更高词元分成与搜索加权。',
    privileges: [
      '智能体在专家库与搜索中获得官方加权推荐',
      '有效词元消耗返点比例提升至 15%',
      '点亮二级 AI 专家专属蓝紫徽章',
      '优先派发高意向客户咨询线索'
    ],
    requirements: [
      '已发布可运行智能体不少于 3 个',
      '近 90 天有效运行量达到平台标准 (≥ 2,000次)',
      'Hermes 执行成功率 ≥ 98%',
      '综合评分 ≥ 4.8 分 & 咨询响应率 ≥ 95%',
      '专家主页资料完整且无严重投诉'
    ],
    tokenRebateRate: 0.15,
    standardRevenueShare: 0.7,
    serviceRevenueShare: 0.85
  },
  3: {
    level: 3,
    title: '三级 AI 专家',
    badge: '三级 AI 专家',
    badgeColor: 'amber',
    description: '平台头部优质专家，持续高使用、高评分、低故障率，通过平台人工复核，享有最高分成与营销资源。',
    privileges: [
      '平台全域首页与核心专区重点推荐',
      '有效词元消耗返点享受平台最高 20% 比例',
      '点亮三级 AI 专家至尊金色徽章',
      '参与平台官方品牌活动与营销资源倾斜',
      '专职客服与法务合规顾问一对一支持'
    ],
    requirements: [
      '持续达到较高的有效运行量 (≥ 10,000次)',
      '拥有多个稳定运行且口碑优秀的智能体',
      '综合评分 ≥ 4.9 分且投诉率与故障率极低',
      '咨询响应与案例交付质量优秀',
      '通过平台专业人工复核 (定期重新评估)'
    ],
    tokenRebateRate: 0.2,
    standardRevenueShare: 0.7,
    serviceRevenueShare: 0.9
  }
};

export const initialCreatorProfile = {
  id: 'creator_linran_001',
  name: '林然 (Maya Studio)',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  title: 'AI 全栈解决方案专家 & 认证 FDE',
  tierLevel: 3 as CreatorTierLevel, // 默认设为 FDE 服务商方便展示全功能
  isRealNameVerified: true,
  isFaceVerified: true,
  isAgreementSigned: true,
  category: '电商零售 & 智能制造',
  skills: ['Agent 工作流编排', 'ERP/CRM 双向集成', '离线私有化部署', 'LangChain/Dify 二开'],
  bio: '专注于电商全渠道智能客服与制造企业知识库自愈系统的落地交付，已累计为 24+ 家中大型企业完成私有化上线。',
  location: '杭州 / 支持全国远程交付与驻场联调',
  contactPhone: '188****6699',
  contactEmail: 'linran.fde@hellome.art',
  githubUrl: 'https://github.com/linran-agent',
  portfolioUrl: 'https://www.hellome.art/expert/fde-linran'
};

export const mockCreatorAgentsList: CreatorAgentItem[] = [
  {
    id: 'agent_ecommerce_cs',
    title: '电商全渠道客服自愈智能体',
    desc: '深度接入聚水潭 ERP、千牛与企业微信，智能识别退换货、发票与催单意图，拦截 75% 重复售后工单。',
    category: '电商零售',
    coverImage: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&auto=format&fit=crop&q=80',
    pricingType: 'freemium',
    price: 49,
    pricingPlans: {
      monthlyPrice: 49,
      annualPrice: 468,
      buyoutPrice: 899,
      preferredPlan: 'annual'
    },
    tokenRebateEnabled: true,
    fdeCustomEnabled: true,
    status: 'published',
    version: '1.0.0',
    platformSupport: 'both',
    viewsCount: 18450,
    likesCount: 6420,
    favoritesCount: 1240,
    commentsCount: 328,
    paidOrdersCount: 48,
    tokensConsumed: 14200000,
    totalRevenue: 34800,
    createdAt: '2026-06-12',
    updatedAt: '2026-08-15'
  },
  {
    id: 'agent_geo_helper',
    title: 'GEO 品牌搜索可见度优化专家',
    desc: '一款帮助品牌生成高权重关键词、检测在各大 AI 搜索引擎可见度并创作 GEO 种草文章的智能工具。',
    category: '内容营销',
    coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    pricingType: 'freemium',
    price: 29,
    pricingPlans: {
      monthlyPrice: 29,
      annualPrice: 268,
      buyoutPrice: 499,
      preferredPlan: 'monthly'
    },
    tokenRebateEnabled: true,
    fdeCustomEnabled: true,
    status: 'published',
    version: '2.0.0',
    platformSupport: 'mac',
    viewsCount: 42100,
    likesCount: 34200,
    favoritesCount: 3890,
    commentsCount: 196,
    paidOrdersCount: 162,
    tokensConsumed: 38900000,
    totalRevenue: 21600,
    createdAt: '2026-07-01',
    updatedAt: '2026-08-16'
  },
  {
    id: 'agent_doc_emergency',
    title: '救急公文与报审文书生成器',
    desc: '基于大模型的行政与公文速写智能体，支持格式合规校验与要点一键扩展。',
    category: '办公协同',
    coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
    pricingType: 'free',
    price: 0,
    pricingPlans: {
      isFree: true,
      monthlyPrice: 0,
      annualPrice: 0,
      buyoutPrice: 0
    },
    tokenRebateEnabled: true,
    fdeCustomEnabled: false,
    status: 'published',
    version: '1.2.0',
    platformSupport: 'windows',
    viewsCount: 78900,
    likesCount: 58600,
    favoritesCount: 5120,
    commentsCount: 542,
    paidOrdersCount: 0,
    tokensConsumed: 29500000,
    totalRevenue: 5900,
    createdAt: '2026-05-18',
    updatedAt: '2026-08-10'
  },
  {
    id: 'agent_medical_rag_draft',
    title: '临床指南检索问答智能体 (企业私有版)',
    desc: '集成三甲医院内科临床诊疗指南与本地知识库索引，用于医生辅助查房与病例质检。',
    category: '医疗健康',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    pricingType: 'paid',
    price: 199,
    pricingPlans: {
      monthlyPrice: 199,
      annualPrice: 1880,
      buyoutPrice: 3880,
      preferredPlan: 'annual'
    },
    tokenRebateEnabled: true,
    fdeCustomEnabled: true,
    status: 'under_review',
    version: '0.9.0',
    platformSupport: 'mac',
    viewsCount: 120,
    likesCount: 18,
    favoritesCount: 6,
    commentsCount: 12,
    paidOrdersCount: 0,
    tokensConsumed: 120000,
    totalRevenue: 0,
    createdAt: '2026-08-14',
    updatedAt: '2026-08-16'
  }
];

export const mockCustomerLeads: CustomerLeadItem[] = [
  {
    id: 'lead_001',
    clientName: '张总 (技术负责人)',
    clientCompany: '杭州某头部服饰电商品牌',
    clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    agentId: 'agent_ecommerce_cs',
    agentTitle: '电商全渠道客服自愈智能体',
    standardVersionAtRequest: 'v2.0.0',
    customizationSummary: '需打通聚水潭 ERP 与钉钉售后群 · 页面：售后工单看板 · 流程：订单拦截流程',
    sourceType: 'trial',
    contactPhone: '139****1829',
    consultedAt: '2026-08-24T09:40:00',
    intentLevel: 'high',
    lastActivity: '10 分钟前运行了退换货接口联调',
    status: 'quoted',
    notes: '客户希望将智能体直接打通他们的聚水潭 ERP 与钉钉售后群，需要 10 天内完成私有化联调。',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        senderName: '张总',
        text: '希望打通聚水潭 ERP 与钉钉售后群，10 天内完成私有化联调。',
        time: '昨天 14:20'
      },
      {
        id: 'm2',
        sender: 'creator',
        senderName: '林然',
        text: '已收到。聚水潭接口文档我这边有现成对接经验，本周可先出联调清单。',
        time: '昨天 16:05'
      }
    ]
  },
  {
    id: 'lead_002',
    clientName: '王经理 (增长总监)',
    clientCompany: '美妆 DTC 出海品牌',
    clientAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    agentId: 'agent_geo_helper',
    agentTitle: 'GEO 品牌搜索可见度优化专家',
    standardVersionAtRequest: 'v2.0.0',
    customizationSummary: '需 Perplexity 品牌提及率批量检测 · 页面：多语种输出配置 · 需接入 Shopify API',
    sourceType: 'consultation',
    contactPhone: '186****9032',
    consultedAt: '2026-08-24T08:50:00',
    intentLevel: 'high',
    lastActivity: '1 小时前发起定制咨询',
    status: 'contacted',
    notes: '需求：批量抓取 ChatGPT 与 Perplexity 中的品牌提及率，并自动生成英文长尾词矩阵。',
    messages: [
      {
        id: 'm3',
        sender: 'user',
        senderName: '王经理',
        text: '标准版看不到 Perplexity 的品牌提及率，能否做成专属看板？',
        time: '今天 10:12'
      }
    ]
  },
  {
    id: 'lead_003',
    clientName: '李工 (IT 运维主管)',
    clientCompany: '苏州精工机械制造有限公司',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    agentId: 'agent-manufacturing-qa',
    agentTitle: '制造行业设备维修与故障诊断智能体',
    standardVersionAtRequest: 'v2.0.0',
    customizationSummary: '需私有化部署工厂内网 · 流程：MES 告警对接 · 需接入设备图纸 PDF 库',
    sourceType: 'consultation',
    contactPhone: '135****4421',
    consultedAt: '2026-08-23T09:40:00',
    intentLevel: 'medium',
    lastActivity: '昨天发起定制咨询',
    status: 'new',
    notes: '需要将设备排障知识库私有化部署到工厂内网，并对接现有 MES 系统告警流。',
    messages: [
      {
        id: 'm4',
        sender: 'user',
        senderName: '李工',
        text: '需要部署到工厂内网，并对接现有 MES 告警流。',
        time: '昨天 09:40'
      }
    ]
  }
];

export const mockCreatorServiceOrders: CreatorServiceOrder[] = [
  {
    id: 'order_fde_8910',
    orderNo: 'FDE-20260816-8910',
    clientName: '张总 (技术负责人)',
    clientCompany: '杭州某头部服饰电商品牌',
    clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    projectTitle: '电商售后智能体 ERP 双向打通与私有部署',
    relatedAgentTitle: '电商全渠道客服自愈智能体',
    contractAmount: 28800,
    platformFeeRate: 0.1, // 平台抽成 10%
    netIncome: 25920, // 创作者 90%
    currentMilestoneStage: 2,
    totalMilestones: 3,
    milestones: [
      {
        title: '阶段一：系统架构设计与需求规格定稿',
        amount: 8640,
        ratio: 0.3,
        status: 'completed',
        deliveryProof: '架构设计图 v1.2 已通过客户签收并解冻放款 ￥7,776'
      },
      {
        title: '阶段二：ERP API 双向打通与自愈流程联调',
        amount: 11520,
        ratio: 0.4,
        status: 'in_progress',
        deliveryProof: '联调完成度 85%，正在做千牛退换货边界测试'
      },
      {
        title: '阶段三：本地容器私有化部署、操作手册与验收',
        amount: 8640,
        ratio: 0.3,
        status: 'pending'
      }
    ],
    status: 'in_dev',
    createdAt: '2026-08-10',
    dueAt: '2026-08-24'
  },
  {
    id: 'order_fde_7821',
    orderNo: 'FDE-20260801-7821',
    clientName: '陈总 (市场副总裁)',
    clientCompany: '新消费连锁咖啡品牌',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    projectTitle: '多门店客诉情感分析与自动工单派发 Agent',
    relatedAgentTitle: '电商全渠道客服自愈智能体',
    contractAmount: 45000,
    platformFeeRate: 0.1,
    netIncome: 40500,
    currentMilestoneStage: 3,
    totalMilestones: 3,
    milestones: [
      { title: '阶段一：方案定制', amount: 13500, ratio: 0.3, status: 'completed' },
      { title: '阶段二：接口与算法训练', amount: 18000, ratio: 0.4, status: 'completed' },
      { title: '阶段三：全员上线与交付培训', amount: 13500, ratio: 0.3, status: 'completed' }
    ],
    status: 'completed',
    createdAt: '2026-07-15',
    dueAt: '2026-08-01'
  }
];

export const mockCreatorWallet: CreatorWalletDetail = {
  availableBalance: 32450.0,
  pendingSettlement: 18144.0, // 进行中订单未结部分 (FDE 托管中)
  totalHistoricalRevenue: 128900.0,
  tokenRebateEarnings: 18450.0,
  paidAgentEarnings: 21650.0,
  fdeServiceEarnings: 88800.0,
  withdrawnTotal: 65000.0,
  individualTaxTotal: 4120.0,
  bankAccount: {
    bankName: '招商银行股份有限公司 (杭州城西科技支行)',
    accountHolder: '林然',
    accountTail: '6214 **** **** 8892',
    alipayAccount: 'linran.fde@maya-studio.com (企业已认证)'
  },
  tokenBreakdown: [
    {
      agentId: 'agent_ecommerce_cs',
      agentTitle: '电商全渠道客服自愈智能体',
      coverImage: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&auto=format&fit=crop&q=80',
      rechargePackageType: '企业 5000万词元大容量算力包',
      rechargeOrdersCount: 18,
      rechargeTotalTokens: 50000000,
      rechargeTotalAmount: 42600,
      rebateRate: 0.20,
      earnedRebate: 8520,
      lastRechargeTime: '10 分钟前'
    },
    {
      agentId: 'agent_geo_helper',
      agentTitle: 'GEO 品牌搜索可见度优化专家',
      coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
      rechargePackageType: '品牌加速 2000万词元加油包',
      rechargeOrdersCount: 42,
      rechargeTotalTokens: 38900000,
      rechargeTotalAmount: 35010,
      rebateRate: 0.20,
      earnedRebate: 7002,
      lastRechargeTime: '2 分钟前'
    },
    {
      agentId: 'agent_doc_emergency',
      agentTitle: '救急公文与报审文书生成器',
      coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
      rechargePackageType: '标准 1000万词元办公基础包',
      rechargeOrdersCount: 36,
      rechargeTotalTokens: 29500000,
      rechargeTotalAmount: 14640,
      rebateRate: 0.20,
      earnedRebate: 2928,
      lastRechargeTime: '5 分钟前'
    }
  ],
  agentSalesBreakdown: [
    {
      agentId: 'agent_ecommerce_cs',
      agentTitle: '电商全渠道客服自愈智能体 (标准版)',
      unitPrice: 299,
      salesCount: 48,
      grossAmount: 14352,
      platformFeeRate: 0.30,
      creatorShareRate: 0.70,
      netEarnings: 10046.4
    },
    {
      agentId: 'agent_geo_helper',
      agentTitle: 'GEO 品牌搜索可见度优化专家 (月卡)',
      unitPrice: 99,
      salesCount: 162,
      grossAmount: 16038,
      platformFeeRate: 0.30,
      creatorShareRate: 0.70,
      netEarnings: 11226.6
    },
    {
      agentId: 'agent_medical_rag_draft',
      agentTitle: '临床指南检索问答智能体 (企业席位授权)',
      unitPrice: 1200,
      salesCount: 1,
      grossAmount: 1200,
      platformFeeRate: 0.30,
      creatorShareRate: 0.70,
      netEarnings: 840
    }
  ],
  withdrawalHistory: [
    {
      id: 'wd_001',
      withdrawNo: 'WD-20260728-9901',
      amount: 25000.0,
      fee: 0.0,
      taxWithheld: 800.0,
      actualArrival: 24200.0,
      bankName: '招商银行 (尾号 8892)',
      accountTail: '8892',
      accountHolder: '林然',
      requestTime: '2026-07-28 14:15:20',
      arrivalTime: '2026-07-28 14:18:05',
      status: 'completed',
      bankTxnHash: 'CMBC-ELEC-20260728-883921004921'
    },
    {
      id: 'wd_002',
      withdrawNo: 'WD-20260630-6721',
      amount: 40000.0,
      fee: 0.0,
      taxWithheld: 1280.0,
      actualArrival: 38720.0,
      bankName: '招商银行 (尾号 8892)',
      accountTail: '8892',
      accountHolder: '林然',
      requestTime: '2026-06-30 11:30:10',
      arrivalTime: '2026-06-30 11:33:45',
      status: 'completed',
      bankTxnHash: 'CMBC-ELEC-20260630-109248550182'
    }
  ],
  monthlyStatements: [
    {
      month: '2026-08',
      periodLabel: '2026年8月 (实时汇算中)',
      grossRevenue: 52400.0,
      tokenRebateIncome: 6200.0,
      agentSalesIncome: 14320.0,
      fdeServiceIncome: 28000.0,
      platformFeeDeducted: 7200.0,
      individualTaxWithheld: 1680.0,
      netIncome: 43520.0,
      settledStatus: 'settling',
      settledDate: '预计 2026-09-05',
      statementNo: 'STM-202608-88301'
    },
    {
      month: '2026-07',
      periodLabel: '2026年7月 (已完税结算)',
      grossRevenue: 48600.0,
      tokenRebateIncome: 5800.0,
      agentSalesIncome: 12300.0,
      fdeServiceIncome: 27000.0,
      platformFeeDeducted: 6700.0,
      individualTaxWithheld: 1560.0,
      netIncome: 40340.0,
      settledStatus: 'settled',
      settledDate: '2026-08-05 00:00',
      statementNo: 'STM-202607-77290'
    },
    {
      month: '2026-06',
      periodLabel: '2026年6月 (已完税结算)',
      grossRevenue: 34500.0,
      tokenRebateIncome: 4200.0,
      agentSalesIncome: 9800.0,
      fdeServiceIncome: 18000.0,
      platformFeeDeducted: 4800.0,
      individualTaxWithheld: 1100.0,
      netIncome: 28600.0,
      settledStatus: 'settled',
      settledDate: '2026-07-05 00:00',
      statementNo: 'STM-202606-66102'
    }
  ],
  records: [
    {
      id: 'tx_001',
      orderNo: 'TXN-20260816-8910-S1',
      type: 'fde_service',
      typeLabel: '企业 FDE 阶段交付',
      title: '「电商售后自愈智能体」阶段一架构验收款解冻到账 (90%分成)',
      grossAmount: 8640.0,
      splitRatio: 0.90,
      platformFee: 864.0,
      taxAmount: 0.0,
      netAmount: 7776.0,
      relatedEntity: '杭州某头部服饰电商品牌 (项目 FDE-20260816-8910)',
      clientName: '张总 (技术负责人)',
      date: '2026-08-16 14:20:18',
      status: 'settled',
      statusLabel: '已结算放款',
      paymentChannel: '招商银行企业专户资金托管直付',
      proofHash: '0x8f3c8a9120debb449102cfa98b172a6b29d4810283c74918e',
      fdeDetails: {
        projectNo: 'FDE-20260816-8910',
        milestoneName: '阶段一：系统架构设计与需求规格定稿',
        milestoneRatio: 0.30,
        acceptanceProof: '架构设计说明书 v1.2 双方签字确认单.pdf (已电子存证)'
      }
    },
    {
      id: 'tx_002',
      orderNo: 'TXN-20260810-7721-TR',
      type: 'token_rebate',
      typeLabel: '词元充值返点',
      title: '8月份智能体用户批量充值算力包返点 (20% 顶级返佣)',
      grossAmount: 21050.0,
      splitRatio: 0.20,
      platformFee: 0.0,
      taxAmount: 0.0,
      netAmount: 4210.0,
      relatedEntity: '客户充值 5000万词元算力专享包 (累计 7 笔企业充值)',
      clientName: '杭州某服饰电商品牌 等 7 家企业客户',
      date: '2026-08-10 03:00:22',
      status: 'settled',
      statusLabel: '已到账',
      paymentChannel: '平台算力充值分账专用池',
      proofHash: '0x221a9c8f0012bce9920147ae5590c8831920acb49201f9810',
      tokenDetails: {
        rechargeOrderNo: 'RCH-20260810-7721',
        rechargeUser: '杭州某服饰电商品牌 等 7 家企业客户',
        rechargePackage: '企业 5000万词元算力专享包 (累计 7 笔)',
        rechargeTokens: 350000000,
        rechargeAmount: 21050.0,
        rebateRate: 0.20
      }
    },
    {
      id: 'tx_003',
      orderNo: 'TXN-20260808-6629-AS',
      type: 'agent_sale',
      typeLabel: '单品订阅售卖',
      title: '「GEO 品牌搜索优化」标准版企业月度订阅 (70% 分成结算)',
      grossAmount: 2673.0,
      splitRatio: 0.70,
      platformFee: 801.9,
      taxAmount: 0.0,
      netAmount: 1871.1,
      relatedEntity: '美妆 DTC 出海品牌 等 27 位客户',
      date: '2026-08-08 10:15:40',
      status: 'settled',
      statusLabel: '已到账',
      paymentChannel: '微信支付商户分账系统',
      proofHash: '0x77c980ab1124dfac8820146bbfa710928a4901826d9104b20',
      invoiceStatus: 'issued'
    },
    {
      id: 'tx_004',
      orderNo: 'TXN-20260801-9981-S3',
      type: 'fde_service',
      typeLabel: '企业 FDE 阶段交付',
      title: '「多门店客诉情感分析 Agent」终审验收与私有化交付结案 (90%)',
      grossAmount: 15000.0,
      splitRatio: 0.90,
      platformFee: 1500.0,
      taxAmount: 0.0,
      netAmount: 13500.0,
      relatedEntity: '新消费连锁咖啡品牌 (项目 FDE-20260801-7821)',
      clientName: '陈总 (市场副总裁)',
      date: '2026-08-01 16:45:00',
      status: 'settled',
      statusLabel: '已全额结案',
      paymentChannel: '招商银行企业专户资金托管直付',
      proofHash: '0x99a180ff4410cdbe883921004abf77621049281a8849102bc',
      fdeDetails: {
        projectNo: 'FDE-20260801-7821',
        milestoneName: '阶段三：全员上线、Docker私有化镜像与交付培训',
        milestoneRatio: 0.30,
        acceptanceProof: '企业终验签署表_已加盖企业公章.pdf'
      }
    },
    {
      id: 'tx_005',
      orderNo: 'TXN-20260728-WD01',
      type: 'withdrawal',
      typeLabel: '收益提现',
      title: '收益提现至招商银行卡 (尾号 8892)',
      grossAmount: 25000.0,
      splitRatio: 1.0,
      platformFee: 0.0,
      taxAmount: 800.0,
      netAmount: -25000.0,
      relatedEntity: '招商银行股份有限公司 (杭州城西科技支行)',
      date: '2026-07-28 14:18:05',
      status: 'completed',
      statusLabel: '已打款成功',
      paymentChannel: '招商银行超级网银直连系统 (0 手续费)',
      proofHash: 'CMBC-ELEC-20260728-883921004921'
    }
  ]
};

export const mockCreatorDisputes: CreatorDisputeItem[] = [
  {
    id: 'dispute_001',
    orderNo: 'FDE-20260720-6621',
    clientName: '刘总监',
    clientCompany: '某数码配件外贸商',
    reason: '客户在阶段二交付后单方面追加 3 个第三方海外 ERP 接口',
    clientDemand: '要求免费包含在原合同内',
    fdeExplanation: '超出原需求规格说明书附录定义范围，建议按增补工作量加收 ￥4,500 或走二期迭代。',
    evidenceFiles: ['原需求确认书_签字盖章.pdf', '沟通聊天记录截图_留痕.zip'],
    platformVerdict: '平台法务介入调解中：已判定属于需求范围外变更，平台建议签署二期增补协议。',
    status: 'in_negotiation',
    updatedAt: '2026-08-14'
  }
];

// =========================================================================
// 平台三大核心身份预设（普通用户、创作者、FDE认证）
// =========================================================================

export interface UserIdentityProfileConfig {
  role: 'normal' | 'creator' | 'fde';
  name: string;
  avatar: string;
  badge: string;
  badgeColor: string;
  title: string;
  tagline: string;
  tierLevel: CreatorTierLevel;
  isRealNameVerified: boolean;
  isFdeCertified: boolean;
  canPublishAgents: boolean;
  canReceiveLeads: boolean;
  tokenRebateRate: number; // 0% / 15% / 20%
  paidRevenueShare: number; // 0% / 70% / 70%
  fdeServiceShare: number; // 0% / 0% / 90%
  description: string;
  privileges: string[];
}

export const mockUserIdentities: Record<'normal' | 'creator' | 'fde', UserIdentityProfileConfig> = {
  normal: {
    role: 'normal',
    name: '普通用户 (138****8000)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
    badge: '普通用户',
    badgeColor: 'slate',
    title: 'AI 探索者 / 终端体验用户',
    tagline: '免提交证件 · 极致隐私保护',
    tierLevel: 1,
    isRealNameVerified: false,
    isFdeCertified: false,
    canPublishAgents: false,
    canReceiveLeads: false,
    tokenRebateRate: 0,
    paidRevenueShare: 0,
    fdeServiceShare: 0,
    description: '无需提交身份证、人脸识别或企业资质，可在沙箱中免费试运行智能体、浏览 FDE 专家并随时申请入驻。',
    privileges: [
      '免实名认证与人脸活体，保护极致隐私',
      '自由在沙箱中免费试运行全站 Hermes 智能体',
      '浏览 AI 专家智库，收藏优质智能体、关注专家',
      '发起一对一定制咨询与商机需求对接',
      '随时在个人中心「一键申请成为创作者 / 申请 FDE」'
    ]
  },
  creator: {
    role: 'creator',
    name: '苏晴 (BrandAI 实验室)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    badge: '创作者 (已实名)',
    badgeColor: 'emerald',
    title: '内容电商智能体架构师 · 资深创作者',
    tagline: '已完成公安实名核验 · 拥有独立公开主页',
    tierLevel: 2,
    isRealNameVerified: true,
    isFdeCertified: false,
    canPublishAgents: true,
    canReceiveLeads: true,
    tokenRebateRate: 0.15,
    paidRevenueShare: 0.70,
    fdeServiceShare: 0,
    description: '已完成公安实名二要素核验，拥有独立可分享创作者主页，可发布智能体、接收咨询意向，享有 15% 词元返点与 70% 付费售卖分成。',
    privileges: [
      '拥有独立可全网分享的作品主页 (hellome.art/expert/...)',
      '可免费发布 Hermes 可运行智能体与付费标准版',
      '享有 15% 智能体调用词元充值返现',
      '享有 70% 标准版智能体直接售卖分成',
      '可接收平台内用户与企业的咨询留言意向',
      '满足条件后可随时签署规则点亮「认证 FDE」'
    ]
  },
  fde: {
    role: 'fde',
    name: '林然 (Ray Lin)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    badge: '认证 FDE',
    badgeColor: 'amber',
    title: '全栈 AI Agent 架构师 · FDE 专家服务商',
    tagline: '平台官方认证 · 收录进 FDE 专家智库',
    tierLevel: 3,
    isRealNameVerified: true,
    isFdeCertified: true,
    canPublishAgents: true,
    canReceiveLeads: true,
    tokenRebateRate: 0.20,
    paidRevenueShare: 0.70,
    fdeServiceShare: 0.90,
    description: '已完成公安实名核验 + 发布至少 1 款经 Hermes 验证可运行的智能体 + 签署 FDE 规则。点亮官方金色徽章，收录进专家智库，享有 90% 企业定制大单分成。',
    privileges: [
      '拥有「认证 FDE」官方金色认证标识与专属免责背书',
      '被官方正式收录进「FDE 专家智库」并享受首页流量推荐',
      '可承接企业二开与私有化部署订单，享 90% 创作者净收益 (官方仅抽10%)',
      '享有 20% 顶额全网词元算力消耗返点 + 月度分红',
      '享有 70% 智能体标准版售卖分成',
      '专享平台项目资金托管、里程碑阶段放款与争议仲裁法务支持'
    ]
  }
};

export interface NormalUserDataset {
  role: 'normal';
  name: string;
  avatar: string;
  phoneMasked: string;
  badge: string;
  badgeColor: string;
  title: string;
  isRealNameVerified: boolean;
  canPublishAgents: boolean;
  canReceiveLeads: boolean;
  tokenRebateRate: number;
  paidRevenueShare: number;
  fdeServiceShare: number;
  description: string;
  features: string[];
}

export const normalUserMockDataset: NormalUserDataset = {
  role: 'normal',
  name: '普通用户 (138****8000)',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
  phoneMasked: '138****8000',
  badge: '普通用户',
  badgeColor: 'slate',
  title: 'AI 探索者 / 终端体验用户',
  isRealNameVerified: false,
  canPublishAgents: false,
  canReceiveLeads: false,
  tokenRebateRate: 0,
  paidRevenueShare: 0,
  fdeServiceShare: 0,
  description: '免提交身份证件、人脸识别与企业资质，可自由试运行全站智能体、浏览 FDE 专家并一键申请入驻。',
  features: [
    '免实名认证与人脸活体，保护极致隐私',
    '自由在沙箱中免费试运行 Hermes 智能体',
    '浏览 AI 专家智库，收藏优质智能体、关注专家',
    '发起一对一定制咨询与商机需求对接',
    '随时在个人中心「一键申请成为创作者 / 申请 FDE」'
  ]
};

export interface CreatorTierDataset {
  tierLevel: CreatorTierLevel;
  tierName: string;
  badge: string;
  badgeColor: string;
  profile: typeof initialCreatorProfile;
  agentsList: CreatorAgentItem[];
  customerLeads: CustomerLeadItem[];
  serviceOrders: CreatorServiceOrder[];
  walletData: CreatorWalletDetail;
  disputes: CreatorDisputeItem[];
  analyticsStats: {
    totalImpressions: number;
    totalTrials: number;
    tokensConsumedFormatted: string;
    tokensRaw: number;
    paidOrdersCount: number;
    conversionRate: string;
    revenueGrowthRate: string;
    estimatedMonthlyRevenue: number;
  };
}

export const creatorDatasetsByTier: Record<CreatorTierLevel, CreatorTierDataset> = {
  // -----------------------------------------------------------------------
  // 1: 普通创作者 (初级体验 / 免费试水阶段)
  // -----------------------------------------------------------------------
  1: {
    tierLevel: 1,
    tierName: '一级 AI 专家',
    badge: '一级 AI 专家',
    badgeColor: 'slate',
    profile: {
      id: 'creator_chenmo_001',
      name: '陈默 (墨流智能设计)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
      title: 'AI 提示词爱好者 · 初级智能体创作者',
      tierLevel: 1 as CreatorTierLevel,
      isRealNameVerified: false,
      isFaceVerified: false,
      isAgreementSigned: false,
      category: '个人效率 & 办公辅助',
      skills: ['基础 Prompt 调试', '文生图工作流', 'Markdown 模板'],
      bio: '刚刚加入平台的初级智能体创作者，致力于打造简单易用的小型办公与效率工具。',
      location: '成都 / 远程',
      contactPhone: '137****1120',
      contactEmail: 'chenmo@example.com',
      githubUrl: 'https://github.com/chenmo-ai',
      portfolioUrl: 'https://www.hellome.art/expert/chenmo'
    },
    agentsList: [
      {
        id: 'agent_weekly_report',
        title: '日常待办与工作周报一键提炼',
        desc: '只需粘贴零散工作备忘，自动按「重点成果/关键突破/下周计划」整理成高管汇报格式。',
        category: '办公协同',
        coverImage: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&auto=format&fit=crop&q=80',
        pricingType: 'free',
        tokenRebateEnabled: true,
        fdeCustomEnabled: false,
        status: 'published',
        viewsCount: 3200,
        likesCount: 1180,
        favoritesCount: 140,
        paidOrdersCount: 0,
        tokensConsumed: 1600000,
        totalRevenue: 160,
        createdAt: '2026-08-01',
        updatedAt: '2026-08-10'
      },
      {
        id: 'agent_xhs_copywriter',
        title: '小红书爆款文案与标题助手',
        desc: '内置 50+ 热门爆款封面标题模板与情绪价值文案结构，专为自媒体创作者设计。',
        category: '内容营销',
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        pricingType: 'free',
        tokenRebateEnabled: true,
        fdeCustomEnabled: false,
        status: 'published',
        viewsCount: 6400,
        likesCount: 2890,
        favoritesCount: 380,
        paidOrdersCount: 0,
        tokensConsumed: 3200000,
        totalRevenue: 320,
        createdAt: '2026-07-20',
        updatedAt: '2026-08-12'
      },
      {
        id: 'agent_email_polish_draft',
        title: '商务英文邮件润色智能体 (草稿)',
        desc: '自动修正语法、增强地道语气与礼貌表达，提升跨国业务沟通效率。',
        category: '办公协同',
        coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
        pricingType: 'free',
        tokenRebateEnabled: false,
        fdeCustomEnabled: false,
        status: 'draft',
        viewsCount: 0,
        likesCount: 0,
        favoritesCount: 0,
        paidOrdersCount: 0,
        tokensConsumed: 0,
        totalRevenue: 0,
        createdAt: '2026-08-16',
        updatedAt: '2026-08-16'
      }
    ],
    customerLeads: [],
    serviceOrders: [],
    walletData: {
      availableBalance: 480.0,
      pendingSettlement: 0.0,
      totalHistoricalRevenue: 480.0,
      tokenRebateEarnings: 480.0, // 仅 10% 基础词元返点
      paidAgentEarnings: 0.0, // 未开通付费售卖
      fdeServiceEarnings: 0.0, // 未开通 FDE 订单
      withdrawnTotal: 0.0,
      individualTaxTotal: 0.0,
      bankAccount: {
        bankName: '中国建设银行 (个人储蓄卡)',
        accountHolder: '陈默',
        accountTail: '6217 **** **** 1120',
        alipayAccount: 'chenmo.design@gmail.com'
      },
      tokenBreakdown: [
        {
          agentId: 'agent_weekly_report',
          agentTitle: '日常待办与工作周报一键提炼',
          coverImage: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&auto=format&fit=crop&q=80',
          rechargePackageType: '个人 500万词元加油包',
          rechargeOrdersCount: 16,
          rechargeTotalTokens: 1600000,
          rechargeTotalAmount: 1600,
          rebateRate: 0.10,
          earnedRebate: 160,
          lastRechargeTime: '3 小时前'
        },
        {
          agentId: 'agent_xhs_copywriter',
          agentTitle: '小红书爆款文案与标题助手',
          coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          rechargePackageType: '创作者 1000万词元灵感包',
          rechargeOrdersCount: 28,
          rechargeTotalTokens: 3200000,
          rechargeTotalAmount: 3200,
          rebateRate: 0.10,
          earnedRebate: 320,
          lastRechargeTime: '1 小时前'
        }
      ],
      agentSalesBreakdown: [],
      withdrawalHistory: [],
      monthlyStatements: [
        {
          month: '2026-08',
          periodLabel: '2026年8月 (实时汇算中)',
          grossRevenue: 320.0,
          tokenRebateIncome: 320.0,
          agentSalesIncome: 0.0,
          fdeServiceIncome: 0.0,
          platformFeeDeducted: 0.0,
          individualTaxWithheld: 0.0,
          netIncome: 320.0,
          settledStatus: 'settling',
          settledDate: '预计 2026-09-05',
          statementNo: 'STM-LV1-202608-01'
        },
        {
          month: '2026-07',
          periodLabel: '2026年7月 (已结算)',
          grossRevenue: 160.0,
          tokenRebateIncome: 160.0,
          agentSalesIncome: 0.0,
          fdeServiceIncome: 0.0,
          platformFeeDeducted: 0.0,
          individualTaxWithheld: 0.0,
          netIncome: 160.0,
          settledStatus: 'settled',
          settledDate: '2026-08-05 00:00',
          statementNo: 'STM-LV1-202607-02'
        }
      ],
      records: [
        {
          id: 'tx_lv1_001',
          orderNo: 'TXN-LV1-20260810-TR01',
          type: 'token_rebate',
          typeLabel: '词元充值返点',
          title: '8月份智能体用户词元充值返点 (10% 返还)',
          grossAmount: 3200.0,
          splitRatio: 0.10,
          platformFee: 0.0,
          taxAmount: 0.0,
          netAmount: 320.0,
          relatedEntity: '用户充值 1000万词元灵感包 (共 28 笔充值)',
          date: '2026-08-10 03:00:15',
          status: 'settled',
          statusLabel: '已到账',
          paymentChannel: '平台基础算力充值分账专区',
          proofHash: '0x1a8bc0092147ea418290abf10928a472910bcda98102',
          tokenDetails: {
            rechargeOrderNo: 'RCH-LV1-20260810-01',
            rechargeUser: '自媒体创作者 等 28 位用户',
            rechargePackage: '创作者 1000万词元灵感包 (28 笔)',
            rechargeTokens: 3200000,
            rechargeAmount: 3200.0,
            rebateRate: 0.10
          }
        },
        {
          id: 'tx_lv1_002',
          orderNo: 'TXN-LV1-20260728-TR02',
          type: 'token_rebate',
          typeLabel: '词元充值返点',
          title: '7月份智能体用户词元充值返点 (10% 返还)',
          grossAmount: 1600.0,
          splitRatio: 0.10,
          platformFee: 0.0,
          taxAmount: 0.0,
          netAmount: 160.0,
          relatedEntity: '用户充值 500万词元加油包 (共 16 笔充值)',
          date: '2026-07-28 02:00:09',
          status: 'settled',
          statusLabel: '已到账',
          paymentChannel: '平台基础算力充值分账专区',
          proofHash: '0x334bbca901289feea881024bc6810287a918230aa92',
          tokenDetails: {
            rechargeOrderNo: 'RCH-LV1-20260728-02',
            rechargeUser: '职场办公用户 等 16 位用户',
            rechargePackage: '个人 500万词元加油包 (16 笔)',
            rechargeTokens: 1600000,
            rechargeAmount: 1600.0,
            rebateRate: 0.10
          }
        }
      ]
    },
    disputes: [],
    analyticsStats: {
      totalImpressions: 9600,
      totalTrials: 4070,
      tokensConsumedFormatted: '4.8M',
      tokensRaw: 4800000,
      paidOrdersCount: 0,
      conversionRate: '0.0%',
      revenueGrowthRate: '+15.2%',
      estimatedMonthlyRevenue: 350
    }
  },

  // -----------------------------------------------------------------------
  // 2: 认证创作者 (实名认证 / 付费模板 / 15%返点 / 线索池)
  // -----------------------------------------------------------------------
  2: {
    tierLevel: 2,
    tierName: '二级 AI 专家',
    badge: '二级 AI 专家',
    badgeColor: 'emerald',
    profile: {
      id: 'creator_zhouqm_002',
      name: '周启明 (智联科技工作室)',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=160&auto=format&fit=crop&q=80',
      title: '认证 AI 应用创作者 · 行业提示词工程师',
      tierLevel: 2 as CreatorTierLevel,
      isRealNameVerified: true,
      isFaceVerified: false,
      isAgreementSigned: false,
      category: '内容营销 & 垂直行业工具',
      skills: ['提示词工程', '知识库构建', '自媒体矩阵批量生成', '付费应用变现'],
      bio: '已在平台发布多款热门付费智能体，聚焦数字营销与公文处理，单月累计付费调用破千次。',
      location: '武汉 / 远程支持',
      contactPhone: '186****7733',
      contactEmail: 'zhouqm.ai@example.com',
      githubUrl: 'https://github.com/zhouqm-ai',
      portfolioUrl: 'https://www.hellome.art/expert/zhouqm'
    },
    agentsList: [
      {
        id: 'agent_geo_helper',
        title: 'GEO 品牌搜索可见度优化专家',
        desc: '帮助品牌生成高权重关键词、检测在各大 AI 搜索引擎可见度并创作 GEO 种草文章的智能工具。',
        category: '内容营销',
        coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
        pricingType: 'paid',
        price: 99,
        tokenRebateEnabled: true,
        fdeCustomEnabled: false,
        status: 'published',
        viewsCount: 42100,
        likesCount: 34200,
        favoritesCount: 3890,
        paidOrdersCount: 162,
        tokensConsumed: 38900000,
        totalRevenue: 16038,
        createdAt: '2026-07-01',
        updatedAt: '2026-08-16'
      },
      {
        id: 'agent_storyboard_master',
        title: '短视频分镜头脚本与分镜大师',
        desc: '输入一段文案，自动解析视觉景别、机位运镜、音效与画面提示词，支持一键导出 Midjourney/MJ 描述。',
        category: '创意设计',
        coverImage: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80',
        pricingType: 'paid',
        price: 199,
        tokenRebateEnabled: true,
        fdeCustomEnabled: false,
        status: 'published',
        viewsCount: 18600,
        likesCount: 9400,
        favoritesCount: 1420,
        paidOrdersCount: 58,
        tokensConsumed: 12400000,
        totalRevenue: 8078,
        createdAt: '2026-07-15',
        updatedAt: '2026-08-14'
      },
      {
        id: 'agent_doc_emergency',
        title: '救急公文与报审文书生成器',
        desc: '基于大模型的行政与公文速写智能体，支持格式合规校验与要点一键扩展，作为高频引流工具。',
        category: '办公协同',
        coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
        pricingType: 'free',
        tokenRebateEnabled: true,
        fdeCustomEnabled: false,
        status: 'published',
        viewsCount: 78900,
        likesCount: 58600,
        favoritesCount: 5120,
        paidOrdersCount: 0,
        tokensConsumed: 29500000,
        totalRevenue: 4425,
        createdAt: '2026-05-18',
        updatedAt: '2026-08-10'
      },
      {
        id: 'agent_banner_copy_review',
        title: '电商爆款主图文案与卖点提炼 (审核中)',
        desc: '深度解析同行竞品差评与主图痛点，生成高点击率的主图文案。',
        category: '电商零售',
        coverImage: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=600&auto=format&fit=crop&q=80',
        pricingType: 'paid',
        price: 149,
        tokenRebateEnabled: true,
        fdeCustomEnabled: false,
        status: 'under_review',
        viewsCount: 0,
        likesCount: 0,
        favoritesCount: 0,
        paidOrdersCount: 0,
        tokensConsumed: 0,
        totalRevenue: 0,
        createdAt: '2026-08-17',
        updatedAt: '2026-08-17'
      }
    ],
    customerLeads: [
      {
        id: 'lead_lv2_001',
        clientName: '王经理 (增长总监)',
        clientCompany: '美妆 DTC 出海品牌',
        clientAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
        agentId: 'agent_geo_helper',
        agentTitle: 'GEO 品牌搜索可见度优化专家',
        sourceType: 'consultation',
        contactPhone: '186****9032',
        consultedAt: '2026-08-24T08:50:00',
        intentLevel: 'high',
        lastActivity: '1 小时前运行了 GEO 核心长尾词分析',
        status: 'contacted',
        notes: '客户希望批量输出英文版 GEO 矩阵，需开通 FDE 专家认证后承接大单。'
      },
      {
        id: 'lead_lv2_002',
        clientName: '陈总 (内容 MCN 主理人)',
        clientCompany: '新映文化传媒',
        clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
        agentId: 'agent_storyboard_master',
        agentTitle: '短视频分镜头脚本与分镜大师',
        sourceType: 'trial',
        contactPhone: '138****6655',
        consultedAt: '2026-08-23T14:20:00',
        intentLevel: 'high',
        lastActivity: '昨天深度体验了脚本分镜功能',
        status: 'new',
        notes: '希望将分镜大师接入企业内网剪辑流水线。'
      }
    ],
    serviceOrders: [],
    walletData: {
      availableBalance: 15640.0,
      pendingSettlement: 2450.0,
      totalHistoricalRevenue: 28541.0,
      tokenRebateEarnings: 6850.0, // 15% 进阶返点
      paidAgentEarnings: 21691.0, // 70% 标准版付费收入
      fdeServiceEarnings: 0.0, // 未开通 Lv.3 FDE 订单
      withdrawnTotal: 12000.0,
      individualTaxTotal: 450.0,
      bankAccount: {
        bankName: '招商银行 (武汉光谷软件园支行)',
        accountHolder: '周启明',
        accountTail: '6225 **** **** 9012',
        alipayAccount: 'zhouqm.ai@example.com'
      },
      tokenBreakdown: [
        {
          agentId: 'agent_geo_helper',
          agentTitle: 'GEO 品牌搜索可见度优化专家',
          coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
          rechargePackageType: '品牌加速 2000万词元加油包',
          rechargeOrdersCount: 42,
          rechargeTotalTokens: 38900000,
          rechargeTotalAmount: 35010,
          rebateRate: 0.15,
          earnedRebate: 5251.5,
          lastRechargeTime: '12 分钟前'
        },
        {
          agentId: 'agent_storyboard_master',
          agentTitle: '短视频分镜头脚本与分镜大师',
          coverImage: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80',
          rechargePackageType: '专业影视 1000万词元生成包',
          rechargeOrdersCount: 15,
          rechargeTotalTokens: 12400000,
          rechargeTotalAmount: 10656.6,
          rebateRate: 0.15,
          earnedRebate: 1598.5,
          lastRechargeTime: '25 分钟前'
        }
      ],
      agentSalesBreakdown: [
        {
          agentId: 'agent_geo_helper',
          agentTitle: 'GEO 品牌搜索可见度优化专家 (标准版)',
          unitPrice: 99,
          salesCount: 162,
          grossAmount: 16038,
          platformFeeRate: 0.30,
          creatorShareRate: 0.70,
          netEarnings: 11226.6
        },
        {
          agentId: 'agent_storyboard_master',
          agentTitle: '短视频分镜头脚本与分镜大师 (专业包)',
          unitPrice: 199,
          salesCount: 58,
          grossAmount: 11542,
          platformFeeRate: 0.30,
          creatorShareRate: 0.70,
          netEarnings: 8079.4
        }
      ],
      withdrawalHistory: [
        {
          id: 'wd_lv2_001',
          withdrawNo: 'WD-20260725-8812',
          amount: 12000.0,
          fee: 0.0,
          taxWithheld: 450.0,
          actualArrival: 11550.0,
          bankName: '招商银行 (尾号 9012)',
          accountTail: '9012',
          accountHolder: '周启明',
          requestTime: '2026-07-25 14:05:12',
          arrivalTime: '2026-07-25 14:10:00',
          status: 'completed',
          bankTxnHash: 'CMBC-ELEC-20260725-9920147721'
        }
      ],
      monthlyStatements: [
        {
          month: '2026-08',
          periodLabel: '2026年8月 (实时汇算中)',
          grossRevenue: 15300.0,
          tokenRebateIncome: 3120.0,
          agentSalesIncome: 8420.0,
          fdeServiceIncome: 0.0,
          platformFeeDeducted: 3608.5,
          individualTaxWithheld: 151.5,
          netIncome: 11540.0,
          settledStatus: 'settling',
          settledDate: '预计 2026-09-05',
          statementNo: 'STM-LV2-202608-01'
        },
        {
          month: '2026-07',
          periodLabel: '2026年7月 (已结算)',
          grossRevenue: 22600.0,
          tokenRebateIncome: 3730.0,
          agentSalesIncome: 13271.0,
          fdeServiceIncome: 0.0,
          platformFeeDeducted: 5687.5,
          individualTaxWithheld: 298.5,
          netIncome: 17001.0,
          settledStatus: 'settled',
          settledDate: '2026-08-05 00:00',
          statementNo: 'STM-LV2-202607-02'
        }
      ],
      records: [
        {
          id: 'tx_lv2_001',
          orderNo: 'TXN-LV2-20260816-AS01',
          type: 'agent_sale',
          typeLabel: '单品订阅售卖',
          title: '「GEO 品牌搜索优化」标准版 86 笔订阅分成 (70%)',
          grossAmount: 12028.5,
          splitRatio: 0.70,
          platformFee: 3608.5,
          taxAmount: 0.0,
          netAmount: 8420.0,
          relatedEntity: '86 位个人与企业客户',
          date: '2026-08-16 18:30:11',
          status: 'settled',
          statusLabel: '已到账',
          paymentChannel: '微信/支付宝商户综合分账',
          proofHash: '0x9920acbf881024eef10928a472910bcda98102'
        },
        {
          id: 'tx_lv2_002',
          orderNo: 'TXN-LV2-20260810-TR01',
          type: 'token_rebate',
          typeLabel: '词元充值返点',
          title: '8月份智能体用户算力充值返点 (15% 进阶返现)',
          grossAmount: 20800.0,
          splitRatio: 0.15,
          platformFee: 0.0,
          taxAmount: 0.0,
          netAmount: 3120.0,
          relatedEntity: '客户充值 2000万词元品牌加油包 (共 32 笔充值)',
          date: '2026-08-10 03:00:10',
          status: 'settled',
          statusLabel: '已到账',
          paymentChannel: '平台算力充值分账专用池',
          proofHash: '0x551a9c8f0012bce9920147ae5590c8831920acb4920',
          tokenDetails: {
            rechargeOrderNo: 'RCH-LV2-20260810-01',
            rechargeUser: '美妆 DTC 出海品牌 等 32 家客户',
            rechargePackage: '品牌加速 2000万词元加油包 (32 笔)',
            rechargeTokens: 20800000,
            rechargeAmount: 20800.0,
            rebateRate: 0.15
          }
        },
        {
          id: 'tx_lv2_003',
          orderNo: 'TXN-LV2-20260801-AS02',
          type: 'agent_sale',
          typeLabel: '单品订阅售卖',
          title: '7月份智能体标准版购买收益 (70% 分成结算)',
          grossAmount: 18958.5,
          splitRatio: 0.70,
          platformFee: 5687.5,
          taxAmount: 0.0,
          netAmount: 13271.0,
          relatedEntity: '上月 134 笔付费订单',
          date: '2026-08-01 10:15:20',
          status: 'settled',
          statusLabel: '已到账',
          paymentChannel: '微信/支付宝商户综合分账',
          proofHash: '0x334bbca901289feea881024bc6810287a918230aa92'
        },
        {
          id: 'tx_lv2_004',
          orderNo: 'TXN-LV2-20260728-TR02',
          type: 'token_rebate',
          typeLabel: '词元消耗返点',
          title: '7月份全网智能体词元消耗返点 (15% 进阶返还)',
          grossAmount: 24866.6,
          splitRatio: 0.15,
          platformFee: 0.0,
          taxAmount: 0.0,
          netAmount: 3730.0,
          relatedEntity: '全网 24.8M 次 API 推理',
          date: '2026-07-28 02:00:19',
          status: 'settled',
          statusLabel: '已到账',
          paymentChannel: '平台算力分账专用池',
          proofHash: '0x8820146bbfa710928a4901826d9104b20'
        },
        {
          id: 'tx_lv2_005',
          orderNo: 'TXN-LV2-20260725-WD01',
          type: 'withdrawal',
          typeLabel: '收益提现',
          title: '收益提现到招商银行 (尾号 9012)',
          grossAmount: 12000.0,
          splitRatio: 1.0,
          platformFee: 0.0,
          taxAmount: 450.0,
          netAmount: -12000.0,
          relatedEntity: '招商银行 (武汉光谷软件园支行)',
          date: '2026-07-25 14:10:00',
          status: 'completed',
          statusLabel: '已打款成功',
          paymentChannel: '招商银行网银直连系统',
          proofHash: 'CMBC-ELEC-20260725-9920147721'
        }
      ]
    },
    disputes: [],
    analyticsStats: {
      totalImpressions: 139600,
      totalTrials: 102200,
      tokensConsumedFormatted: '80.8M',
      tokensRaw: 80800000,
      paidOrdersCount: 220,
      conversionRate: '4.8%',
      revenueGrowthRate: '+38.6%',
      estimatedMonthlyRevenue: 14200
    }
  },

  // -----------------------------------------------------------------------
  // 3: 三级 AI 专家 (最高等级 / 20% 顶额返点)
  // -----------------------------------------------------------------------
  3: {
    tierLevel: 3,
    tierName: '三级 AI 专家',
    badge: '三级 AI 专家',
    badgeColor: 'amber',
    profile: initialCreatorProfile,
    agentsList: mockCreatorAgentsList,
    customerLeads: mockCustomerLeads,
    serviceOrders: mockCreatorServiceOrders,
    walletData: mockCreatorWallet,
    disputes: mockCreatorDisputes,
    analyticsStats: {
      totalImpressions: 218000,
      totalTrials: 145000,
      tokensConsumedFormatted: '122.5M',
      tokensRaw: 122500000,
      paidOrdersCount: 310,
      conversionRate: '8.4%',
      revenueGrowthRate: '+64.2%',
      estimatedMonthlyRevenue: 58500
    }
  }
};

