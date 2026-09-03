import { FDEExpert, AgentSolution, FDEServicePackage, CaseStudy, ClientReview, AgentPricingPlans } from '../types';
import type { AgentAdapterPackage } from '../../shared/adapterPackages';

export type { AgentAdapterPackage };

export interface HellomeAgentItem {
  id: string;
  title: string;
  desc: string;
  category: string;
  coverImage: string;
  gradient: string;
  tagColor: string;
  badge?: string;
  /** 客户端 OS 适配：三选一展示 */
  platformSupport?: 'mac' | 'windows' | 'both';
  canFDECustom?: boolean;
  authorName?: string;
  authorId?: string;
  price?: number;
  pricingPlans?: AgentPricingPlans;
  likesCount: string | number;
  favoritesCount: string | number;
  commentsCount: string | number;
  sharesCount?: string | number;
  usageCount?: string;
  rating?: number;
  /** 外部工具适配分发包，平台名由创作者自定义 */
  adapterPackages?: AgentAdapterPackage[];
}

export const mockHellomeHomeAgents: HellomeAgentItem[] = [
  {
    id: 'hz-canvas',
    title: 'Hz Canvas无限画布',
    desc: 'Hz Canvas 是一个把无限画布、素材标注和 AI 视频生成整合在一起的本地图片视频创作工具。',
    category: '创作工具',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-amber-950 via-slate-900 to-black',
    tagColor: 'amber',
    badge: '热门爆款',
    platformSupport: 'both',
    canFDECustom: true,
    authorName: 'Hz 创意工作室',
    authorId: 'fde-maya',
    price: 39,
    pricingPlans: {
      monthlyPrice: 39,
      annualPrice: 368,
      buyoutPrice: 599,
      preferredPlan: 'annual'
    },
    likesCount: '2.4k',
    favoritesCount: '1.8k',
    commentsCount: 326,
    usageCount: '12.8k',
    adapterPackages: [
      {
        id: 'adp_hz_workbuddy',
        platformName: 'WorkBuddy',
        fileName: 'hz-canvas-workbuddy.zip',
        size: '1 KB',
        url: '/uploads/hz-canvas-workbuddy.zip'
      },
      {
        id: 'adp_hz_codex',
        platformName: 'Codex',
        fileName: 'hz-canvas-codex.zip',
        size: '1 KB',
        url: '/uploads/hz-canvas-codex.zip'
      },
      {
        id: 'adp_hz_enterprise',
        platformName: '企业内部工具',
        fileName: 'hz-canvas-enterprise.zip',
        size: '1 KB',
        url: '/uploads/hz-canvas-enterprise.zip'
      }
    ],
    rating: 4.9
  },
  {
    id: 'geo-helper',
    title: 'GEO助手',
    desc: '一款帮助品牌生成关键词、检测 AI 可见度并创作 GEO 文章的智能运营工具。',
    category: '内容营销',
    coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-amber-400 via-amber-300 to-yellow-200',
    tagColor: 'yellow',
    badge: '增长神器',
    platformSupport: 'mac',
    canFDECustom: true,
    authorName: '苏晴 (Maya)',
    authorId: 'fde-maya',
    price: 29,
    pricingPlans: {
      monthlyPrice: 29,
      annualPrice: 268,
      buyoutPrice: 499,
      preferredPlan: 'monthly'
    },
    likesCount: '5.1k',
    favoritesCount: '3.6k',
    commentsCount: 580,
    usageCount: '34.2k',
    rating: 5.0
  },
  {
    id: 'doc-emergency',
    title: '救急文书工坊',
    desc: '基于 AI 大模型的智能文书工具，支持一键生成请示、报告、通知、总结等常用文书，帮助你快速...',
    category: '办公协同',
    coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    tagColor: 'blue',
    badge: '高频办公',
    platformSupport: 'windows',
    canFDECustom: true,
    authorName: '林然 (认证FDE)',
    authorId: 'fde-linran',
    likesCount: '8.9k',
    favoritesCount: '6.4k',
    commentsCount: 892,
    usageCount: '58.6k',
    rating: 4.8
  },
  {
    id: 'global-news-radar',
    title: '全球新闻实时雷达',
    desc: '实时汇聚全球新闻、官方信息源、市场行情和地图态势，帮助你快速掌握正在发生的重要事件。',
    category: '办公协同',
    coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-sky-900 via-slate-900 to-indigo-950',
    tagColor: 'sky',
    badge: '实时感知',
    platformSupport: 'both',
    canFDECustom: true,
    authorName: '云帆',
    authorId: 'fde-yunfan',
    likesCount: '3.7k',
    favoritesCount: '2.9k',
    commentsCount: 412,
    usageCount: '21.5k',
    rating: 4.9
  },
  {
    id: 'job-seek-assistant',
    title: '求职小助手',
    desc: '一款 AI 求职工作台，支持简历优化、JD 匹配、模拟面试和投递跟进，帮助你更高效拿到心仪...',
    category: '办公协同',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-blue-500 via-indigo-500 to-cyan-400',
    tagColor: 'indigo',
    badge: '秋招必备',
    platformSupport: 'mac',
    canFDECustom: true,
    authorName: '张博 (智能体架构师)',
    authorId: 'fde-linran',
    likesCount: '6.3k',
    favoritesCount: '4.8k',
    commentsCount: 730,
    usageCount: '43.1k',
    rating: 4.9
  },
  {
    id: 'pdf-tools',
    title: '轻量PDF小工具',
    desc: '快速完成 PDF 合并、页面提取与旋转，让文件整理更高效率。',
    category: '创作工具',
    coverImage: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-rose-500 via-red-500 to-amber-600',
    tagColor: 'rose',
    badge: '实用工具',
    platformSupport: 'windows',
    canFDECustom: false,
    authorName: 'Hellome官方',
    authorId: 'fde-linran',
    likesCount: '11.5k',
    favoritesCount: '9.8k',
    commentsCount: '1.2k',
    usageCount: '89.4k',
    rating: 4.8
  },
  {
    id: 'img-compress',
    title: '图片压缩小工具',
    desc: '一个无需登录的在线图片压缩工具：上传 JPG、PNG 等图片后，可调节质量并保持格式下载。',
    category: '图片视频',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-cyan-500 via-sky-400 to-blue-500',
    tagColor: 'cyan',
    badge: '无损压缩',
    platformSupport: 'both',
    canFDECustom: false,
    authorName: 'Hellome官方',
    authorId: 'fde-linran',
    likesCount: '14.2k',
    favoritesCount: '12.1k',
    commentsCount: '1.5k',
    usageCount: '102.3k',
    rating: 4.9
  },
  {
    id: 'ecommerce-ai-cs',
    title: '电商全渠道客服自愈智能体',
    desc: '深度接入聚水潭 ERP、千牛与企业微信，智能识别退换货、发票与催单意图，拦截 75% 重复售后工单。',
    category: '内容营销',
    coverImage: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-slate-900',
    tagColor: 'blue',
    badge: 'FDE推荐',
    platformSupport: 'mac',
    canFDECustom: true,
    authorName: '林然 (认证FDE)',
    authorId: 'fde-linran',
    likesCount: '1.8k',
    favoritesCount: '1.2k',
    commentsCount: 198,
    usageCount: '6.4k',
    rating: 4.9
  },
  {
    id: 'industry-offline-rag',
    title: '制造工业离线设备排障知识库',
    desc: '面向工厂机房物理隔离环境，纯离线运行千亿级设备维修手册与图纸问答，毫秒级定位 PLC 与工控故障码。',
    category: '创作工具',
    coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-slate-800 via-indigo-950 to-slate-900',
    tagColor: 'indigo',
    badge: 'FDE私有部署',
    platformSupport: 'windows',
    canFDECustom: true,
    authorName: '云帆',
    authorId: 'fde-yunfan',
    likesCount: '980',
    favoritesCount: '760',
    commentsCount: 114,
    usageCount: '2.1k',
    rating: 5.0
  }
];

export const mockExperts: FDEExpert[] = [
  {
    id: 'fde-linran',
    expertNo: 'AI-EXP-000001',
    name: '林然',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    title: '电商 AI 解决方案架构师',
    verifyType: 'ai_expert',
    verifyLabel: 'AI 专家',
    expertLevel: 3,
    roleTag: '电商/零售 专家',
    domainTags: ['电商客服', '知识库构建', '工作流自动化', '私有化部署'],
    rating: 4.9,
    ordersCount: 38,
    praiseRate: 98,
    responseTime: '通常 24h 内响应',
    bio: '前头部电商大厂 LLM 架构师，专注零售电商业务智能体改造，擅长结合 Dify / LangGraph 打造多渠道全自动售后问答系统、ERP 对接与定制模型微调，已为 38+ 家品牌客户落地千万级降本方案。',
    location: '上海 · 支持全国远程与驻场',
    serviceModes: ['远程交付', '驻场实施', '长期技术维护与SLA'],
    guarantees: [
      '实名认证与平台背景审查通过',
      '资金平台托管，按阶段里程碑交付验收后结款',
      '签署标准保密协议 (NDA) 与源码所有权转移协议',
      '交付后享有 30 天无忧免费售后 Bug 修复保障'
    ],
    skills: ['Dify', 'LangGraph', 'FastGPT', 'ERP/OMS API 对接', 'DeepSeek R1/V3 私有部署', 'Qdrant 向量检索'],
    stats: {
      repeatRate: '42%',
      avgDeliveryDays: 12,
      totalClientRevenue: '￥180w+',
      validUsageCount: 42800,
      hermesSuccessRate: 99.4,
      publishedAgentsCount: 4
    },
    experienceYears: 6,
    featured: true,
    featuredQuote: '“不搞虚浮 Demo，只做能直接嵌入业务闭环、产生真实订单转化的工业级智能体。”',
    socialLinks: {
      github: 'linran-ai',
      email: 'linran.ai@fdehub.com',
      wechat: 'linran_ecommerce_ai'
    }
  },
  {
    id: 'fde-yunfan',
    expertNo: 'AI-EXP-000002',
    name: '云帆',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    title: '制造业 & 工业视觉AI团队负责人',
    verifyType: 'ai_expert',
    verifyLabel: 'AI 专家',
    expertLevel: 2,
    roleTag: '工业/智能制造 专家',
    domainTags: ['知识库图谱', '视觉质检', '边缘离线部署', '设备预测维护'],
    rating: 4.8,
    ordersCount: 21,
    praiseRate: 96,
    responseTime: '15分钟内快速响应',
    bio: '国家智能制造重点实验室背景，拥有 8 年工业物联网与 AI 落地经验，专注汽车零部件、高端机床与精密制造企业的本地离线大模型一体机部署与设备故障智能排查知识库。',
    location: '苏州 / 无锡 · 全国出差实施',
    serviceModes: ['厂区驻场调研', '私有化内网一体机部署', '专属驻点陪产'],
    guarantees: [
      '企业法人主体认证 & ISO9001 软件交付认证',
      '纯内网物理隔离部署，零数据外流承诺',
      '提供完整系统设计说明书与工业协议对接代码',
      '终身免费提供安全漏洞加固补丁'
    ],
    skills: ['Ollama / vLLM', 'Milvus', 'Modbus / OPC-UA 协议', 'RagFlow', 'TensorRT 加速', '本地信创适配'],
    stats: {
      repeatRate: '60%',
      avgDeliveryDays: 20,
      totalClientRevenue: '￥320w+',
      validUsageCount: 8600,
      hermesSuccessRate: 98.7,
      publishedAgentsCount: 3
    },
    experienceYears: 8,
    featuredQuote: '“让工厂老师傅三十年的维修经验，变成全厂年轻技工秒级调用的离线智能导师。”'
  },
  {
    id: 'fde-maya',
    expertNo: 'AI-EXP-000003',
    name: 'Maya (苏晴)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    title: '内容增长 & 全域营销智能体专家',
    verifyType: 'ai_expert',
    verifyLabel: 'AI 专家',
    expertLevel: 3,
    roleTag: '内容/流量增长 专家',
    domainTags: ['营销获客', '爆款视频脚本', '小红书矩阵', '社媒舆情监控'],
    rating: 5.0,
    ordersCount: 46,
    praiseRate: 100,
    responseTime: '通常 1h 内响应',
    bio: '前 4A 广告公司技术总监，全网操盘超 5 亿播放矩阵，自研「金字塔爆款脚本生成流」与自动化多平台发布管线，为美妆、3C 数码、知识付费类目定制高转化智能体。',
    location: '杭州 / 深圳 · 支持全国远程',
    serviceModes: ['远程深度定制', '团队 prompt 操盘手内训', '年度流量伴跑'],
    guarantees: [
      '官方认证 AI 专家',
      '平台质保金 100,000 元先行赔付保障',
      '交付含可直接商用的工作流源文件与运营指南',
      '支持 7 天内无理由调优微调 3 次'
    ],
    skills: ['Coze / 扣子', 'ComfyUI 图像工作流', '飞书多维表格 API', '小红书/抖音私域自动化', '爆款模型精调'],
    stats: {
      repeatRate: '55%',
      avgDeliveryDays: 7,
      totalClientRevenue: '￥140w+',
      validUsageCount: 52000,
      hermesSuccessRate: 99.8,
      publishedAgentsCount: 5
    },
    experienceYears: 5,
    featured: true,
    featuredQuote: '“AI 不仅是提效工具，更是让 1 个人拥有 100 人创意内容中台的杠杆。”'
  },
  {
    id: 'fde-zhangheng',
    expertNo: 'AI-EXP-000004',
    name: '张恒',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    title: '金融合规与研报深度解析架构师',
    verifyType: 'ai_expert',
    verifyLabel: 'AI 专家',
    expertLevel: 2,
    roleTag: '金融/风控 专家',
    domainTags: ['财报结构化', '智能风控', '合规筛查', '量化数据流'],
    rating: 4.9,
    ordersCount: 29,
    praiseRate: 97,
    responseTime: '通常 24h 内响应',
    bio: 'CFA持证人与资深全栈工程师，擅长处理海量多源异构非结构化财报、招股书及监管文书，为券商投研团队与私募机构打造毫秒级数据洞察智能体。',
    location: '北京 · 全国支持',
    serviceModes: ['专属私有集群搭建', '接口定制与算法交付', '驻场安全加固'],
    guarantees: ['双重金融级合规认证', '提供完整审计日志方案', '数据留存本地符合监管要求'],
    skills: ['DeepSeek R1', 'LlamaParse', 'ClickHouse', 'Python量化引擎', '金融大模型RLHF'],
    stats: {
      repeatRate: '48%',
      avgDeliveryDays: 14,
      totalClientRevenue: '￥210w+',
      validUsageCount: 9400,
      hermesSuccessRate: 98.9,
      publishedAgentsCount: 3
    },
    experienceYears: 7,
    featuredQuote: '“在金融业务中，1%的幻觉就是100%的灾难，构建确定性检索框架是核心。”'
  },
  {
    id: 'fde-chenzimo',
    expertNo: 'AI-EXP-000005',
    name: '陈子墨',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
    title: '法务科技与政企协同 AI 架构师',
    verifyType: 'ai_expert',
    verifyLabel: 'AI 专家',
    expertLevel: 1,
    roleTag: '法律/政企 专家',
    domainTags: ['合同智能审查', '法律法规知识库', '信创适配', '政务审批'],
    rating: 4.9,
    ordersCount: 33,
    praiseRate: 99,
    responseTime: '2小时内快速响应',
    bio: '联合多名法学博士创立「法言智检」，专攻建设工程、投融资并购及劳动争议领域的合同穿透式审查与条款风险预警，支持华为鲲鹏/麒麟信创国产化部署。',
    location: '北京 / 成都 · 全国驻场',
    serviceModes: ['私有化信创交付', '定制法律审查规则库', '专职律师+工程师双重交付'],
    guarantees: ['律所专业法律背书', '支持信创软硬件全栈兼容', '平台百万担保资金兜底'],
    skills: ['国产大模型(GLM/Kimi/Qwen)', '信创环境适配', 'Docx精准渲染回写', '权限多租户隔离'],
    stats: {
      repeatRate: '64%',
      avgDeliveryDays: 16,
      totalClientRevenue: '￥260w+',
      validUsageCount: 4200,
      hermesSuccessRate: 98.5,
      publishedAgentsCount: 2
    },
    experienceYears: 9,
    featuredQuote: '“把法务总监严苛的避坑思维，转化为每个业务人员手边 7×24 小时的防御盾牌。”'
  },
  {
    id: 'fde-emily',
    expertNo: 'AI-EXP-000006',
    name: '艾米丽 (Emily)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    title: '医疗健康与就医导诊智能体架构师',
    verifyType: 'ai_expert',
    verifyLabel: 'AI 专家',
    expertLevel: 1,
    roleTag: '医疗/大健康 专家',
    domainTags: ['挂号导诊', '慢病随访', 'HIS/EMR 系统对接', '健康科普'],
    rating: 4.9,
    ordersCount: 18,
    praiseRate: 98,
    responseTime: '通常 24h 内响应',
    bio: '三甲医院信息科联合研发背景，专注于医疗问答智能体、患者复诊随访工作流、慢病管理知识库系统对接，严守医学合规与患者隐私安全边界。',
    location: '广州 · 支持远程与驻场',
    serviceModes: ['院内内网部署', '云端脱敏接入', '医护操作人员培训'],
    guarantees: ['等保三级安全合规标准', '患者隐私数据脱敏认证', '医学专家委员会知识库审核'],
    skills: ['FHIR / HL7 医疗协议', '医疗专业词表微调', '安全脱敏中间件', '企微健康管理助手'],
    stats: {
      repeatRate: '50%',
      avgDeliveryDays: 18,
      totalClientRevenue: '￥150w+',
      validUsageCount: 3100,
      hermesSuccessRate: 98.2,
      publishedAgentsCount: 1
    },
    experienceYears: 6,
    featuredQuote: '“安全与严谨是医疗智能体的第一生命线，精准导诊让医疗资源发挥最大价值。”'
  },
  {
    id: 'fde-zhouchen',
    expertNo: 'AI-EXP-000007',
    name: '周晨',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=300&auto=format&fit=crop&q=80',
    title: '企业流程自动化与智能体方案顾问',
    verifyType: 'ai_expert',
    verifyLabel: 'AI 专家',
    expertLevel: 1,
    roleTag: '企业服务 / 流程咨询 专家',
    domainTags: ['流程梳理', '需求调研', '智能体规划', '跨部门协同'],
    rating: 5.0,
    ordersCount: 0,
    praiseRate: 100,
    responseTime: '通常 24h 内响应',
    bio: '刚完成平台 AI 专家实名认证，长期服务企业数字化与流程再造项目。当前专注帮客户梳理业务场景与智能体落地路径，首个 Hermes 可运行作品筹备中，欢迎直接发起项目咨询。',
    location: '深圳 · 支持全国远程',
    serviceModes: ['远程需求调研', '方案共创工作坊', 'PoC 试点陪跑'],
    guarantees: [
      '已完成公安真人实名认证',
      '签署标准保密协议 (NDA)',
      '咨询响应透明，方案交付里程碑可追踪'
    ],
    skills: ['业务流程建模', '飞书/钉钉集成', 'RAG 知识库规划', 'Prompt 工程', 'Hermes 沙箱调试'],
    stats: {
      repeatRate: '—',
      avgDeliveryDays: 0,
      totalClientRevenue: '—',
      validUsageCount: 0,
      hermesSuccessRate: 0,
      publishedAgentsCount: 0
    },
    experienceYears: 4,
    featuredQuote: '“先搞清业务闭环，再谈智能体；没有可验证的运行作品，也不妨碍先把需求聊透。”'
  }
];

export const mockAgentSolutions: AgentSolution[] = [
  {
    id: 'agent-ecommerce-service',
    title: '电商全渠道智能客服与售后自愈助手',
    subtitle: '自动识别商品、订单物流及退换货诉求，支持直连电商ERP与企业微信',
    coverImage: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&auto=format&fit=crop&q=80',
    authorId: 'fde-linran',
    authorName: '林然',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    authorVerifyType: 'verified_fde',
    authorVerifyLabel: '认证 FDE',
    tags: ['电商客服', '订单自查', '售后工单', 'ERP打通'],
    category: '电商零售',
    likesCount: 1248,
    favoritesCount: 936,
    usesCount: 18420,
    rating: 4.9,
    description: '针对淘系、京东、抖音、拼多多及独立站商户打造。毫秒级解析买家意图，处理催发货、物流拦截、修改地址、规格推荐及尺码建议等常见场景。遇到复杂客诉可一键生成标准结构化工单推送到人工客服看板。',
    capabilities: [
      '智能识别 120+ 类电商高频售后诉求与情绪安抚',
      '支持通过 Webhook / API 实时查询 ERP 订单状态与物流信息',
      '一键支持企业微信、飞书、淘宝千牛及独立站网页插件接入',
      '内置防止“薅羊毛”策略与敏感词拦截合规网关'
    ],
    samplePrompts: [
      '“我前天买的外套还没发货，能帮我查下物流并且改下收货地址吗？”',
      '“衣服尺码偏大还是偏小？我身高175体重65kg穿什么码合适？”',
      '“申请退货退款，但是运费险怎么赔付？寄件地址在哪里？”'
    ],
    systemPromptSnippet: '你是由林然团队研发的专业电商智能客服专家。你的职责是热情、精准、高情商地解决顾客在售前咨询、订单查询、售后维权等方面的问题...',
    businessIntegrationTips: '本标准版提供核心问答与意图识别内核。如需打通聚水潭/万里牛/旺店通 ERP，或部署在私有专属服务器，请一键咨询 FDE 林然进行深度二次开发。',
    priceFrom: 12800,
    demoConversation: [
      { role: 'user', content: '你好，我刚拍下的那件羊绒大衣，能帮我把收件地址从杭州改成上海吗？订单号是 TB8921738291' },
      { role: 'assistant', content: '您好！已为您定位到订单【TB8921738291 · 经典双面羊绒大衣】。\n\n📦 **仓库发货状态查询**：该订单目前处于【仓库配货中，尚未打单拦截】阶段。\n✨ **地址修改确认**：系统已帮您发起修改申请，将收件地址更新为【上海市】。\n\n请您在 10 分钟内留意站内信确认信息。若还有其他关于面料保养或尺码的疑问，随时告诉我哦！' }
    ]
  },
  {
    id: 'agent-manufacturing-qa',
    title: '制造行业设备维修与故障诊断智能体',
    subtitle: '离线秒级检索十万页机床与产线图纸，辅助维修技师快速定位故障排错',
    coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    authorId: 'fde-yunfan',
    authorName: '云帆',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    authorVerifyType: 'verified_creator',
    authorVerifyLabel: '创作者',
    tags: ['工业知识库', '设备维修', '故障代码排查', '离线部署'],
    category: '智能制造',
    likesCount: 862,
    favoritesCount: 646,
    usesCount: 9230,
    rating: 4.8,
    description: '专为工厂设备维保与车间技术员设计。整合 CNC 数控机床、液压系统、工业机器人及自动化流水线标准 SOP 手册。支持输入故障报警代码（如 E-402, Err-12）即刻输出排查步骤与备件清单。',
    capabilities: [
      '工业图纸 PDF 与复杂电路/气路图跨模态结构化解析',
      '精准匹配故障树（Fault Tree Analysis）诊断链路',
      '支持工厂局域网纯离线部署，保障设备机密绝不外流',
      '提供手持工业平板 PDA 交互界面与语音对讲诊断模式'
    ],
    samplePrompts: [
      '“3号注塑机出现报警代码 Err-204，伴随液压系统压力骤降，怎么排查？”',
      '“发那科机器人关节减速机漏油，标准更换密封圈与润滑脂的 SOP 步骤是什么？”',
      '“数控立车主轴发热严重，温度超过75℃，可能由哪些轴承磨损引起？”'
    ],
    systemPromptSnippet: '你是工业智能制造设备诊断工程师助手。针对用户提出的设备报警与故障现象，依据工业安全操作规范给出严谨步骤...',
    businessIntegrationTips: '可定制集成 OPC-UA / PLC 实时采集数据流，实现设备异常时主动告警并生成维修工单。点击右侧咨询 FDE 云帆获取厂区实施方案。',
    priceFrom: 28000,
    demoConversation: [
      { role: 'user', content: '车间川崎工业机器人 2 号轴报警 A-1029，伺服电机过载保护跳闸，请给出排查步骤。' },
      { role: 'assistant', content: '⚙️ **故障定位诊断**：【川崎机器人 · A-1029 轴2过载警告】\n\n🔍 **推荐排查优先级 SOP**：\n1. **机械卡滞检查**：切断动力电，手动盘动轴2减速机，检查是否有金属碎屑或连杆干涉。\n2. **抱闸线圈电压**：万用表测量抱闸释放线圈 DC24V 是否到位，防止带刹车硬转。\n3. **电机电缆绝缘**：检查编码器动力电缆插头是否存在油污或屏蔽层破损。\n\n⚠️ **安全警示**：复位试机前务必确认安全防护栏内无人作业，并佩戴防砸手套。' }
    ]
  },
  {
    id: 'agent-video-growth',
    title: '短视频爆款营销脚本与黄金3秒策划师',
    subtitle: '输入产品与目标客群，自动输出符合抖音/小红书算法的高完播率脚本分镜',
    coverImage: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&auto=format&fit=crop&q=80',
    authorId: 'fde-maya',
    authorName: 'Maya (苏晴)',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    authorVerifyType: 'verified_fde',
    authorVerifyLabel: '认证 FDE',
    tags: ['爆款文案', '分镜脚本', '小红书种草', '短视频带货'],
    category: '内容创作',
    likesCount: 2103,
    favoritesCount: 1577,
    usesCount: 31200,
    rating: 5.0,
    description: '提炼千万级播放爆款视频底层叙事模型。自动生成「痛点悬念黄金前3秒 Hook」、「反直觉认知冲突转折」、「产品沉浸式场景植入」以及「强行动召唤 CTA」，附带精细化拍摄机位与口播节奏标注。',
    capabilities: [
      '涵盖美妆、3C 数码、家居日用、知识付费等 18 个主流消费品类',
      '输出标准影视工业三栏分镜表（画面描述 + 景别运镜 + 旁白音效）',
      '内置违禁词与极限词实时合规校验，防止平台限流封禁',
      '支持一键导出至飞书多维表格与剪映草稿工程'
    ],
    samplePrompts: [
      '“帮我写一条便携式挂脖小风扇的抖音带货视频脚本，目标客群是夏季通勤白领女性”',
      '“针对小红书打造一款无糖低卡全麦面包的真实测评种草图文脚本，突出饱腹感”',
      '“如何策划一条知识付费课程的‘焦虑反转’痛点短视频？写出3个不同维度的开头Hook”'
    ],
    systemPromptSnippet: '你是全网顶级短视频操盘手策划智能体。精通算法推荐机制、完播率心理学与视觉停留诱因...',
    businessIntegrationTips: '支持定制打通企业私域素材库、批量生成 100+ 条差异化脚本及多账号矩阵发布系统。立即咨询 FDE Maya 获取专属增长方案。',
    priceFrom: 9800,
    demoConversation: [
      { role: 'user', content: '我们是一家做户外轻量化露营天幕的品牌，客单价 399 元，请给一条 45 秒抖音短视频脚本，突出 3 分钟极速单人搭建和防暴雨。' },
      { role: 'assistant', content: '🎬 **【45秒爆款带货短视频脚本 · 极速露营天幕】**\n\n📌 **黄金3秒 Hook（视觉冲突）**：\n- **画面**：特写暴雨倾盆浇下，镜头下拉，天幕下主角悠闲喝热咖啡，滴水不漏。\n- **口播**：“千万别买普通天幕！营地突然下暴雨，别人都在手忙脚乱收帐篷，你却在……”\n\n⏱️ **中间承接（15s-30s 痛点+操作实录）**：\n- **画面**：快剪对比传统天幕穿杆20分钟满头大汗 vs 本款【一拉一扣，单人3分钟秒撑起】。\n- **文案**：“女生一个人也能单手秒搭，防暴雨涂层实测抗 8 级大风。”\n\n🎯 **收尾 CTA（40s-45s 促销指令）**：\n- **口播**：“今晚直播间限时赠送 4 根加粗地钉，点击左下角一键上车！”' }
    ]
  },
  {
    id: 'geo-helper',
    title: 'GEO助手',
    subtitle: '帮助品牌生成关键词、检测 AI 可见度并创作 GEO 文章的智能运营工具',
    coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    authorId: 'fde-maya',
    authorName: 'Maya (苏晴)',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    authorVerifyType: 'verified_fde',
    authorVerifyLabel: '认证 FDE',
    tags: ['GEO优化', '品牌可见度', '长尾词', '内容营销'],
    category: '内容营销',
    likesCount: 1890,
    favoritesCount: 1418,
    usesCount: 24600,
    rating: 4.9,
    description: '面向品牌市场与增长团队。自动生成 GEO 长尾关键词矩阵、检测 ChatGPT / Perplexity 中的品牌提及率，并批量产出符合搜索引擎与 AI 引擎双优化的 GEO 文章草稿。',
    capabilities: [
      '品牌关键词与竞品词库自动挖掘',
      'AI 搜索引擎可见度批量检测',
      '多语种 GEO 文章结构化生成',
      '支持导出至飞书多维表格与 CMS'
    ],
    samplePrompts: [
      '「帮我检测品牌在 Perplexity 中的提及率，并生成 50 个英文长尾词」',
      '「基于我们的 SaaS 产品卖点，批量生成 GEO 优化文章大纲」'
    ],
    systemPromptSnippet: '你是 GEO 品牌增长与 AI 可见度优化专家...',
    businessIntegrationTips: '支持定制打通企业私域素材库、Shopify 产品 API 及专属品牌词库。立即咨询 FDE Maya 获取专属增长方案。',
    priceFrom: 0,
    pricingPlans: { isFree: true },
    demoConversation: [
      { role: 'user', content: '我们是一个美妆 DTC 出海品牌，请检测 Perplexity 中的品牌提及率并生成长尾词矩阵。' },
      { role: 'assistant', content: '已为您完成品牌可见度扫描，并生成 48 个高潜力英文长尾词矩阵，可按品类与竞品维度导出。' }
    ]
  },
  {
    id: 'agent-financial-parser',
    title: '金融研报与上市公司财报结构化洞察智能体',
    subtitle: '多维提取非结构化财报、EBITDA营收比对、重大风险与对赌协议穿透',
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    authorId: 'fde-zhangheng',
    authorName: '张恒',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    authorVerifyType: 'verified_fde',
    authorVerifyLabel: '认证 FDE',
    tags: ['金融投研', '财报分析', '风险穿透', '对赌协议'],
    category: '金融与风控',
    likesCount: 945,
    favoritesCount: 709,
    usesCount: 12100,
    rating: 4.9,
    description: '服务于基金经理、投资分析师与券商行业研究员。秒级吞吐上百页 PDF 财报与招股书，自动清洗合并资产负债表与现金流量表数据，生成估值模型参数比对与潜在财务造假红旗预警。',
    capabilities: [
      '高精度复杂跨页三线表与图表 OCR 结构化提取',
      '营收毛利拆解、存货周转率异动及关联交易深挖',
      '支持生成符合投决会标准的 Markdown 摘要报告与 Excel 数据包',
      '集成监管处罚公告与涉诉涉执舆情交叉核验'
    ],
    samplePrompts: [
      '“解析某新能源车企最新季度财报，分析毛利率下滑的根本原因及研发费用资本化比例”',
      '“对比分析两家光伏组件龙头企业的存货减值准备计提政策与现金流健康度”'
    ],
    systemPromptSnippet: '你是资深投研分析师与智能财报审计专家。以严谨的数据逻辑和客观的中立视角输出分析...',
    businessIntegrationTips: '支持私有化部署在金融机构合规隔离内网，打通 Wind / 彭博或内部投研数据库。咨询 FDE 张恒定制企业级投研中台。',
    priceFrom: 36000,
    demoConversation: [
      { role: 'user', content: '请帮我梳理某消费电子企业 2025 年年报中，海外业务应收账款增幅远超营收增幅的潜在风险点。' },
      { role: 'assistant', content: '📊 **【财务健康度深度穿透分析报告】**\n\n🔍 **异动核心指标比对**：\n- 海外营业收入：同比增长 +12.4%（28.6亿元）\n- 海外应收账款净额：同比增长 **+48.7%**（9.2亿元，占营收比重由23%激增至32.1%）\n- 应收账款周转天数（DSO）：由 68 天拉长至 112 天\n\n⚠️ **三项主要合规与坏账风险关注点**：\n1. **渠道压货或放宽信用期**：存在为达业绩考核在年末对海外经销商实施超常规授信可能。\n2. **汇率波动与地缘坏账计提风险**：海外子公司坏账准备计提比例仅为 3.5%，显著低于行业平均 7.2%。\n3. **对经营性现金流的实际侵蚀**：报告期内经营活动现金净流入同比下滑 31.8%。' }
    ]
  },
  {
    id: 'agent-contract-screener',
    title: '企业级合同智能审查与合规风险预警系统',
    subtitle: '穿透审查违约金陷阱、管辖权漏洞、知识产权归属与非标对赌条款',
    coverImage: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    authorId: 'fde-chenzimo',
    authorName: '陈子墨',
    authorAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80',
    authorVerifyType: 'verified_creator',
    authorVerifyLabel: '创作者',
    tags: ['法务合规', '合同审查', '风险条款修订', '信创支持'],
    category: '企业服务',
    likesCount: 1512,
    favoritesCount: 1134,
    usesCount: 24300,
    rating: 4.9,
    description: '针对企业采购合同、销售合作框架协议、保密协议（NDA）及劳动合同。像一位十年资深法务总监一样逐句审查，输出带批注与修改建议的 Word 文档，标红高危法律隐患。',
    capabilities: [
      '精准识别单方解约权不对等、无限连带责任等 200+ 类法律风险项',
      '提供「己方进攻型」与「双方平衡型」两套实操修改建议条款',
      '支持 Docx 原样格式批注回写与红线比对模式',
      '支持信创国产操作系统及私有化数据库本地部署'
    ],
    samplePrompts: [
      '“审查这份软件定制开发技术服务合同，重点查看验收标准模糊与尾款拖欠条款”',
      '“针对高管竞业限制协议，判断补偿金标准与竞业范围是否符合最新司法解释”'
    ],
    systemPromptSnippet: '你是企业法务合规审查智能体，严格依据《中华人民共和国民法典》及相关司法解释提供审查意见...',
    businessIntegrationTips: '支持对接 OA 系统（泛微/致远/钉钉/飞书）发起自动化合同预审流。咨询 FDE 陈子墨团队定制专属法务知识库与信创部署。',
    priceFrom: 19800,
    demoConversation: [
      { role: 'user', content: '乙方发来的一份供应链采购协议中写道：“甲方若延迟付款超3日，每日需支付合同总额 1% 的违约金；乙方若延迟交付，仅需赔偿实际直接损失。”该条款如何修改？' },
      { role: 'assistant', content: '⚖️ **【合同条款不平等风险审查与修订建议】**\n\n🔴 **风险定性**：该条款属于典型的**严重权利义务不对等与过高违约金陷阱**。每日 1% 违约金年化高达 365%，远超法定受保护上限；同时乙方免除了可得利益损失赔偿。\n\n✍️ **推荐修改意见（替换条款）**：\n“双方约定：任何一方未按本协议约定履行付款或交付义务的，每逾期一日，应按照**逾期未付金额（或逾期未交付货物对应价值）的万分之五（0.05%）**向守约方支付违约金。若违约金不足以弥补守约方因逾期所遭受的直接损失与合理维权费用的，违约方仍应予以全额赔偿。”' }
    ]
  },
  {
    id: 'agent-medical-triage',
    title: '医疗健康就医导诊与慢病随访智能助手',
    subtitle: '多轮问诊评估病情分级，推荐就诊科室，自动化患者术后与用药随访',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    authorId: 'fde-emily',
    authorName: '艾米丽 (Emily)',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    authorVerifyType: 'verified_fde',
    authorVerifyLabel: '认证 FDE',
    tags: ['智能导诊', '慢病管理', '患者随访', 'HIS对接'],
    category: '医疗健康',
    likesCount: 780,
    favoritesCount: 585,
    usesCount: 11400,
    rating: 4.9,
    description: '面向综合医院、专科诊所及互联网医疗平台。通过严谨的多轮结构化问询采集患者主诉、现病史与过敏史，精准推荐就诊科室与专家，并在就诊后自动触发按周/月的用药依从性关怀随访。',
    capabilities: [
      '覆盖 30+ 二级临床学科的精准医学分诊逻辑树',
      '自动识别急危重症高危预警信号（如胸痛濒死感）并强制给出急诊就医警示',
      '支持与医院 HIS 系统、排班挂号接口对接',
      '具备严格的患者敏感信息脱敏与医疗免责声明机制'
    ],
    samplePrompts: [
      '“最近持续右下腹隐痛，伴随低烧和食欲减退，应该挂哪个科室？”',
      '“高血压患者术后出院第一周，如何配置自动化血压打卡与复查提醒流程？”'
    ],
    systemPromptSnippet: '你是专业医疗导诊与随访辅助智能体。遵守医学伦理与隐私保护规范，严正声明仅提供就医分诊建议而非最终确诊结论...',
    businessIntegrationTips: '支持院内私有云部署、对接微信公众号/企微随访助手。点击咨询 FDE 艾米丽获取医疗等保合规解决方案。',
    priceFrom: 22000,
    demoConversation: [
      { role: 'user', content: '我父亲今年68岁，今早突然出现一侧嘴角歪斜，说话含糊不清，右手拿筷子无力，请问应该怎么处理？' },
      { role: 'assistant', content: '🚨 **【急危重症紧急就医预警】**\n\n⚠️ **疑似急性脑卒中（中风）典型表现（FAST原则）！时间就是大脑！**\n\n🚑 **请立即采取以下紧急救治措施**：\n1. **立即拨打 120 急救电话**，明确告知调度员老人出现“单侧肢体无力、口角歪斜、言语不清”，要求送往具备【脑卒中绿色通道】的三甲医院。\n2. **保持平卧与呼吸道通畅**：解开衣领，头偏向一侧防止呕吐物窒息，**切勿随意喂水、喂药或剧烈摇晃老人**。\n3. **记录发病时间**：精确记录症状首次出现的时间，溶栓黄金时间窗口通常为 **4.5 小时内**。\n\n*声明：本提示为紧急就医指引，请以 120 医护人员当面指导为准！*' }
    ]
  }
];

export const mockServicePackages: FDEServicePackage[] = [
  {
    id: 'pkg-ecommerce-custom',
    expertId: 'fde-linran',
    title: '企业全渠道客服系统与 ERP 深度对接',
    desc: '打通聚水潭 / 万里牛 / 旺店通等主流电商 ERP，定制品牌私有知识库，实现 90% 售后问题全自动处理与工单直连。',
    price: 18800,
    priceUnit: '起 / 套',
    deliveryTime: '10 - 15 个工作日',
    deliverables: [
      'Dify / FastGPT 定制知识库中台部署',
      '电商 ERP 订单/物流 Webhook 双向数据交互接口',
      '企微 / 网页端客服聊天嵌入组件与坐席转接台',
      '专属 Prompt 调优手册与 100+ 品牌真实问答集沉淀',
      '完整技术开发文档与系统源码交付'
    ],
    suitableFor: '天猫/京东/抖音月销 100 万+ 的品牌电商、跨境独立站卖家',
    features: ['ERP 实时打通', '情绪安抚与反诈策略', '全自动工单派发', '支持私有化部署'],
    popularBadge: '最受欢迎'
  },
  {
    id: 'pkg-workflow-automation',
    expertId: 'fde-linran',
    title: '电商多维运营工作流与日报自动化改造',
    desc: '自动聚合淘系生意参谋、抖音罗盘、直通车投放与售后工单数据，每日早 8 点自动生成高管经营看板与异常预警。',
    price: 12800,
    priceUnit: '起 / 项',
    deliveryTime: '7 - 10 个工作日',
    deliverables: [
      '跨平台数据爬虫/API 汇总中台搭建',
      '飞书多维表格 / 钉钉经营日报自动化推送机器人',
      '广告投放 ROI 异常与断货风险智能诊断模型',
      '团队使用视频教程与 1 次线下/远程实操培训'
    ],
    suitableFor: '追求数据驱动精细化运营的多平台电商运营团队',
    features: ['7×24h 自动巡检', '多源异构数据整合', '大模型经营归因分析']
  },
  {
    id: 'pkg-monthly-sla',
    expertId: 'fde-linran',
    title: '企业 AI 智能体月度运维与能力持续迭代',
    desc: '由资深 FDE 团队提供专属技术后盾，定期评测问答准确率、更新知识库语料、更新适配大模型最新版本（如 DeepSeek V3/R1）。',
    price: 3800,
    priceUnit: '月',
    deliveryTime: '按月周期托管',
    deliverables: [
      '每月 2 次知识库坏例深度诊断与 Prompt 重构升级',
      '5×8h 紧急技术故障 30 分钟内响应修复',
      '每月大模型 API Token 消耗优化与成本控制分析',
      '季度技术演进规划咨询会'
    ],
    suitableFor: '无专职 AI 工程师但核心业务已深度依赖智能体的成长型企业',
    features: ['专属技术保障群', '持续微调升级', '成本极致优化', 'SLA 响应承诺']
  },
  {
    id: 'pkg-industrial-offline',
    expertId: 'fde-yunfan',
    title: '工厂内网离线大模型一体机私有部署方案',
    desc: '在厂区物理隔离局域网部署 Ollama/vLLM 高性能推理服务器与 Milvus 知识库，100% 数据保密与零泄密风险。',
    price: 45000,
    priceUnit: '起 / 台',
    deliveryTime: '15 - 20 个工作日',
    deliverables: [
      '国产 GPU 服务器/工业工控机软硬件环境配置与加速优化',
      '万页工业图纸与设备维修 SOP 知识库结构化清洗入库',
      '多终端（车间大屏/手持工业平板）定制交互前端',
      '交付完整本地信创适配报告与系统恢复镜像包'
    ],
    suitableFor: '汽车零部件、精密制造、航空航天等对机密数据极度敏感的工业制造企业',
    features: ['纯物理离线断网', '亚秒级推理响应', '工业协议对接', '驻厂实施培训'],
    popularBadge: '工业首选'
  },
  {
    id: 'pkg-shortvideo-growth',
    expertId: 'fde-maya',
    title: '全域爆款短视频与小红书矩阵自动化系统',
    desc: '打造从选品挖掘、爆款对标拆解、批量生成脚本到自动化剪辑分发的一体化内容增长流水线。',
    price: 15800,
    priceUnit: '起 / 套',
    deliveryTime: '7 - 12 个工作日',
    deliverables: [
      '定制「金字塔爆款脚本生成器」专属 Coze / 扣子工作流',
      '小红书高赞图文批量生成模板与排版助手',
      '企业私域品宣素材库检索挂载',
      '2 次团队 Prompt 实操集训与月度爆款复盘'
    ],
    suitableFor: 'MCN 机构、品牌内容营销部、知识博主与跨境独立站卖家',
    features: ['高完播率算法模型', '批量化生成', '矩阵号提效 10 倍', '赠送实操手册']
  }
];

export const mockCaseStudies: CaseStudy[] = [
  {
    id: 'case-1',
    expertId: 'fde-linran',
    title: '某头部国潮服饰品牌：全渠道 AI 客服改造实录',
    clientIndustry: '时尚与快消服装',
    clientName: '杭州某知名国潮服饰（年 GMV 1.2 亿）',
    challenge: '大促期间人工客服日均接待超 8,000 人次，响应排队超 15 分钟，售后退换货差评率达 4.2%，且多店铺多 ERP 系统数据割裂无法快速拦截已打单包裹。',
    solution: 'FDE 林然团队基于 Dify + 聚水潭 ERP API 搭建双核智能体，前置过滤 88% 的催发货/修改地址与尺码咨询；针对复杂退换货自动调用物流拦截接口并在 3 秒内反馈顾客。',
    roiMetrics: [
      { label: '人工客服成本降低', value: '45%' },
      { label: '平均响应时间缩短', value: '从 15min → 1.2s' },
      { label: '大促售后差评率降至', value: '0.8%' },
      { label: '首月挽回错发损失', value: '￥160,000+' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['电商客服', '大促提效', 'ERP深度打通', '千万级降本']
  },
  {
    id: 'case-2',
    expertId: 'fde-linran',
    title: '某 3C 数码跨境独立站：多语种技术答疑与售后自愈',
    clientIndustry: '3C 数码与出海跨境',
    clientName: '深圳某智能穿戴品牌（出海欧美日韩）',
    challenge: '海外时差导致夜间咨询无人值守，用户因不会蓝牙配对退货率高达 18%，雇佣多语种外籍客服月成本超 8 万元。',
    solution: '搭建支持英/德/法/西/日/韩 6 语种的精准技术支持智能体，内置交互式排错图解引导，无缝集成 Shopify 与 Zendesk 工单流。',
    roiMetrics: [
      { label: '海外夜间成交转化率提升', value: '+32%' },
      { label: '因操作误解退货率降低', value: '-65%' },
      { label: '年节省外语客服人力', value: '￥720,000' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['跨境出海', '多语种智能体', 'Shopify集成', '退货率压降']
  },
  {
    id: 'case-3',
    expertId: 'fde-yunfan',
    title: '江苏某精密汽车零部件厂：离线设备维保知识大脑',
    clientIndustry: '汽车零部件制造',
    clientName: '苏州某 Tier-1 汽车冲压与焊接供应商',
    challenge: '高精数控机床意外停机每小时损失近 5 万元，老技师退休后青年工人面对复杂告警排查平均耗时 3.5 小时。',
    solution: 'FDE 云帆团队驻厂 15 天，梳理 12 年来 8,000 份维修工单与 400 册机床图纸，在厂区机房部署纯内网一体机，技工持防爆平板拍照/语音即可秒出诊断树。',
    roiMetrics: [
      { label: '平均排障时间缩短', value: '从 3.5h → 20min' },
      { label: '全年减少意外停机损失', value: '￥1,800,000+' },
      { label: '新技师独立上岗周期', value: '由 6 个月 → 1 个月' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['智能制造', '工业离线一体机', '设备停机压降', '车间实操']
  },
  {
    id: 'case-zhouchen-1',
    expertId: 'fde-zhouchen',
    title: '某连锁零售总部：跨部门流程梳理与智能体落地蓝图',
    clientIndustry: '零售连锁 / 企业服务',
    clientName: '华南某区域连锁超市总部（80+ 门店）',
    solution:
      '用两周工作坊拆解采购、仓配、门店报损三条链路，输出可落地的智能体优先级清单与 Hermes PoC 路径，并完成飞书审批流与知识库挂载方案。',
    roiMetrics: [
      { label: '流程节点梳理完成', value: '46 个' },
      { label: '可自动化场景识别', value: '12 项' },
      { label: '首期 PoC 上线周期', value: '3 周' },
      { label: '跨部门对齐会议压缩', value: '-40%' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['流程梳理', '需求调研', '智能体规划', '飞书集成']
  },
  {
    id: 'case-zhouchen-2',
    expertId: 'fde-zhouchen',
    title: '某制造型企业：售后工单智能分派试点',
    clientIndustry: '离散制造',
    clientName: '东莞某精密模具厂售后中心',
    solution:
      '基于历史工单与设备型号知识库，搭建售后智能分派助手，自动识别紧急度并推荐技师；对接钉钉群机器人推送处理进度。',
    roiMetrics: [
      { label: '工单首响时长缩短', value: '从 4h → 35min' },
      { label: '分派准确率', value: '91%' },
      { label: '试点覆盖产线', value: '3 条' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['工单分派', '知识库', '钉钉集成']
  },
  {
    id: 'case-zhangheng-1',
    expertId: 'fde-zhangheng',
    title: '某券商研究所：招股书与财报结构化抽取',
    clientIndustry: '金融科技',
    clientName: '上海某中型券商研究部',
    solution:
      '搭建招股书/年报字段抽取与风控红旗检测流水线，输出结构化表格并对接内部研报 CMS，人工复核工作量显著下降。',
    roiMetrics: [
      { label: '单篇研报整理耗时', value: '从 6h → 40min' },
      { label: '关键字段抽取准确率', value: '94%' },
      { label: '月均处理文档量', value: '180+ 份' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['财报结构化', '合规筛查', '研报提效']
  },
  {
    id: 'case-chenzimo-1',
    expertId: 'fde-chenzimo',
    title: '某建筑央企：合同条款风险穿透审查',
    clientIndustry: '建筑工程与法务科技',
    clientName: '某央企基建项目法务部',
    solution:
      '将历史争议条款沉淀为审查规则，部署合同智能审查助手，自动标注延期、付款、违约金等高风险条款并生成修改建议。',
    roiMetrics: [
      { label: '单份合同初审时长', value: '从 2 天 → 3h' },
      { label: '高风险条款漏检率', value: '-70%' },
      { label: '信创环境适配', value: '已通过' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507679799987-4e9946947b4d?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['合同审查', '法律法规', '信创适配']
  },
  {
    id: 'case-maya-1',
    expertId: 'fde-maya',
    title: '某美妆品牌：小红书爆款脚本矩阵投放',
    clientIndustry: '内容营销',
    clientName: '杭州某新锐美妆品牌增长部',
    solution:
      '搭建爆款脚本生成与多账号排期工作流，按人群钩子自动产出 Hook-Body-CTA 结构文案，并同步投放素材库。',
    roiMetrics: [
      { label: '月均爆款素材产出', value: '120+ 条' },
      { label: '单条素材制作周期', value: '从 2 天 → 20min' },
      { label: '投放 CTR 提升', value: '+28%' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['爆款脚本', '小红书矩阵', '内容增长']
  },
  {
    id: 'case-emily-1',
    expertId: 'fde-emily',
    title: '某三甲医院：慢病随访与导诊助手试点',
    clientIndustry: '医疗健康',
    clientName: '华东某三甲医院内分泌科',
    solution:
      '基于随访手册与院内知识库搭建慢病随访助手，支持复诊提醒、用药问答与异常指标升级人工；对接微信服务号触达患者。',
    roiMetrics: [
      { label: '随访覆盖率提升', value: '+35%' },
      { label: '护士重复答疑时长', value: '-50%' },
      { label: '试点患者满意度', value: '4.7/5' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80'
    ],
    tags: ['慢病随访', '导诊', '医疗知识库']
  }
];

export const mockClientReviews: ClientReview[] = [
  {
    id: 'rev-1',
    expertId: 'fde-linran',
    clientName: '赵先生',
    clientCompany: '杭州某美妆护肤旗舰店 运营总监',
    clientAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    rating: 5.0,
    date: '2026-07-28',
    projectTitle: '电商全渠道客服自愈智能体',
    comment: '林然老师对电商业务流程的理解极其深刻！从前置沟通、方案设计到最终对接聚水潭只用了 10 天。大促期间顶住了几十万次并发，问答准确率非常惊人，完全不是市面上那种套壳 Demo 可以比拟的。',
    tags: ['交付清晰', '响应极快', '业务理解深', '强烈推荐'],
    verifiedOrder: true,
    expertReply: {
      content: '感谢团队对跨境文案 Agent 的认可！后续如果需要对接 Shopify 原生 API，随时在平台咨询我。',
      visibility: 'public',
      repliedAt: '2026-07-29'
    }
  },
  {
    id: 'rev-2',
    expertId: 'fde-linran',
    clientName: '王女士',
    clientCompany: '上海某轻奢家居品牌 电商技术负责人',
    clientAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    rating: 5.0,
    date: '2026-06-15',
    projectTitle: '电商多维运营工作流智能体',
    comment: '以前每天早上几个运营助理要花 2 个多小时从各个后台导出 Excel 做报表，现在每天早上 8 点整飞书群里准时弹出包含智能洞察的高管大屏，有异常还会标红预警，真正实现了业务数字化！',
    tags: ['效率提升显著', '技术扎实', '文档规范'],
    verifiedOrder: true,
    expertReply: {
      content: '报表调度异常那段我们已在内部排期，会单独给你一份修复说明，不放在公开主页以免影响其他客户判断。',
      visibility: 'private',
      repliedAt: '2026-06-16'
    }
  },
  {
    id: 'rev-3',
    expertId: 'fde-yunfan',
    clientName: '李厂长',
    clientCompany: '无锡某重型机械制造企业 生产副总',
    clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    rating: 4.9,
    date: '2026-05-20',
    projectTitle: '制造行业设备维修与故障诊断智能体',
    comment: '云帆团队不仅技术硬核，而且非常耐心地在车间跟班调研了整整一周。整个方案完全运行在厂区局域网内，保密性无可挑剔，维修师傅们反馈现在查图纸和故障代码比翻大厚书快太多了。',
    tags: ['驻厂敬业', '保密性好', '工业级落地'],
    verifiedOrder: true
  },
  {
    id: 'rev-4',
    expertId: 'fde-maya',
    clientName: '张敏',
    clientCompany: '广州某快消品 MCN 机构 创意总监',
    clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    rating: 5.0,
    date: '2026-08-02',
    projectTitle: '全域爆款短视频与小红书矩阵智能体',
    comment: 'Maya 交付的这套工作流直接让我们的编导产出翻了 5 倍！生成的脚本 Hook 点非常抓人，上个月靠这套体系跑出了两条百万播放的爆款带货视频，服务费两周就赚回来了！',
    tags: ['ROI极高', '内容敏锐度强', '交付超出预期'],
    verifiedOrder: true
  }
];

export const industriesList = [
  '全部行业',
  '电商零售',
  '智能制造',
  '金融与风控',
  '内容创作',
  '企业服务',
  '医疗健康'
];

export const capabilitiesList = [
  '全部能力',
  '智能体开发',
  '工作流自动化',
  '私有部署',
  '系统集成',
  '运维托管',
  '知识库构建'
];
