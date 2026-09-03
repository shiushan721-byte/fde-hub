import { VerifyType } from './index';
import type { AgentAdapterPackage } from '../../shared/adapterPackages';

// 平台两类核心用户主体：普通用户 / AI 专家
// creator / fde 为历史兼容别名，UI 一律按 expert 展示
export type UserIdentityRole = 'normal' | 'expert' | 'creator' | 'fde';

export interface UserIdentityInfo {
  role: UserIdentityRole;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  isRealNameVerified: boolean;
  isExpertCertified: boolean;
  /** @deprecated */
  expertLevel?: 1 | 2 | 3;
  hasPublicHomepage: boolean;
  canPublishAgents: boolean;
  tokenRebateRate: number;
  privileges: string[];
}

/** @deprecated 已取消专家分级，保留类型以免旧 mock 编译失败 */
export type AIExpertTierLevel = 1 | 2 | 3;
export type CreatorTierLevel = AIExpertTierLevel;

export interface AIExpertTierConfig {
  level: AIExpertTierLevel;
  title: string;
  badgeLabel: string;
  badgeColor: string;
  shortMeaning: string; // 核心含义
  conditionsSummary: string; // 准入条件
  privileges: string[]; // 享有权益
  tokenRebateRate: number; // 有效词元消耗返点示例 (一级 10%, 二级 15%, 三级 20%)
  evaluationCycle: string; // 评估周期 (一级长期有效，二级/三级月度或季度评估)
  auditMethod: 'auto' | 'rolling_auto' | 'data_and_manual'; // 审核方式
}

// 7 种认证状态: 未认证 | 已实名(未发布) | 一级AI专家 | 二级AI专家 | 三级AI专家 | 认证暂停 | 认证撤销
export type AIExpertCertStatus =
  | 'unverified'        // 未实名
  | 'real_name_only'    // 已实名但未发布可运行智能体
  | 'level_1'           // 一级 AI 专家
  | 'level_2'           // 二级 AI 专家
  | 'level_3'           // 三级 AI 专家
  | 'suspended'         // 认证暂停
  | 'revoked';          // 认证撤销

// AI 专家官方免责声明
export const AI_EXPERT_DISCLAIMER =
  '该 AI 专家已完成真人实名认证，并发布了至少一个经 Hermes 沙箱验证、当前可稳定运行的智能体。等级标识代表其平台真实使用数据与活跃表现，不代表平台对其线下交付或商业服务结果提供连带担保。';

export const FDE_CERT_DISCLAIMER = AI_EXPERT_DISCLAIMER;

export interface CreatorTierInfo {
  level: CreatorTierLevel;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  privileges: string[];
  requirements: string[];
  tokenRebateRate: number; // 词元返点比例 10%-20%
  standardRevenueShare?: number;
  serviceRevenueShare?: number;
}

export interface AgentPricingPlans {
  monthlyPrice?: number; // 按月付费 (元/月)
  annualPrice?: number;  // 按年付费 (元/年)
  buyoutPrice?: number;  // 终身买断 (元)
  isFree?: boolean;      // 免费开源
  preferredPlan?: 'monthly' | 'annual' | 'buyout';
}

export interface AgentKnowledgeItem {
  id: string;
  name: string;
  size: string;
  status: 'ready' | 'indexing';
  docCount: number;
  type: 'pdf' | 'docx' | 'md' | 'faq';
  uploadedAt: string;
}

export interface AgentToolConfigItem {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface AgentModelConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  contextRounds: number;
}

// 创作者发布的智能体
export interface CreatorAgentItem {
  id: string;
  title: string;
  desc: string;
  category: string;
  coverImage: string;
  pricingType: 'free' | 'freemium' | 'paid';
  price?: number; // 默认/基准价格 (元)
  pricingPlans?: AgentPricingPlans; // 包含按月/按年/买断定价
  tokenRebateEnabled: boolean; // 是否开启词元返点
  fdeCustomEnabled: boolean; // 是否开启 FDE 接单/二开通道
  status: 'published' | 'draft' | 'under_review' | 'offline';
  version?: string;
  skillPackage?: {
    fileName: string;
    size: string;
    version: string;
    hermesCompatibility: string;
    lastValidatedAt: string;
  };
  viewsCount: number;
  likesCount: number;
  favoritesCount: number;
  commentsCount?: number;
  trialsCount?: number;
  usageCount?: string | number;
  paidOrdersCount: number;
  tokensConsumed: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;

  // 核心配置项 (Agent Config & SOP)
  systemPrompt?: string;
  welcomeMessage?: string;
  starterPrompts?: string[];
  sopSteps?: string[];
  knowledgeBases?: AgentKnowledgeItem[];
  ragConfig?: {
    similarityThreshold: number;
    topK: number;
    rerankEnabled: boolean;
  };
  tools?: AgentToolConfigItem[];
  modelConfig?: AgentModelConfig;
  /** 通用智能体：发布到广场；客户专属实例不在此类型中管理 */
  agentKind?: 'universal';
  /** 客户端平台适配：Mac / Windows / 双端 */
  platformSupport?: 'mac' | 'windows' | 'both';
  /** 外部工具适配分发包 */
  adapterPackages?: AgentAdapterPackage[];
  /** 当前线上标准版本号，普通用户始终使用最新可用标准版 */
  currentStandardVersion?: string;
  /** 标准版历史版本列表 */
  standardVersionHistory?: string[];
}

/** 通用智能体标准版版本记录 */
export interface StandardAgentVersion {
  version: string;
  releaseNotes: string;
  releasedAt: string;
  hermesValidated: boolean;
  isLatest: boolean;
}

/** 客户专属智能体实例（基于通用版分叉，不进入公共广场） */
export interface CustomerAgentInstance {
  id: string;
  title: string;
  baseAgentId: string;
  baseAgentTitle: string;
  /** 创建时基于的标准版本 */
  basedOnStandardVersion: string;
  /** 当前通用版最新版本（用于升级提醒，不自动覆盖） */
  latestStandardVersionAvailable?: string;
  createdByFdeId: string;
  createdByFdeName: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  boundSkillVersion: string;
  status: 'draft' | 'hermes_validating' | 'active' | 'suspended';
  visibility: 'customer_only';
  customizations: {
    pagesModified: string[];
    flowsModified: string[];
    skillModified: boolean;
    promptsModified: boolean;
    dataSources: string[];
    integrations: string[];
  };
  /** 标准版已更新但专属实例未吸收时的提醒 */
  upgradeReminder?: {
    message: string;
    latestStandardVersion: string;
  };
  relatedLeadId?: string;
  createdAt: string;
  updatedAt: string;
}

// 客户线索
export interface CustomerLeadItem {
  id: string;
  clientName: string;
  clientCompany: string;
  clientAvatar: string;
  agentId: string;
  agentTitle: string;
  /** 咨询发起时的标准版本 */
  standardVersionAtRequest?: string;
  /** 结构化定制规格摘要 */
  customizationSummary?: string;
  sourceType: 'trial' | 'consultation';
  contactPhone: string;
  /** 客户发起咨询的时间（ISO 或可读字符串） */
  consultedAt: string;
  intentLevel: 'high' | 'medium' | 'low';
  lastActivity: string;
  status: 'new' | 'contacted' | 'quoted' | 'signed' | 'closed';
  notes: string;
  /** 创作者回复记录（用户侧以消息提醒展示） */
  messages?: ConsultationMessage[];
}

export interface ConsultationMessage {
  id: string;
  sender: 'user' | 'creator';
  senderName: string;
  text: string;
  time: string;
}

// 创作者服务订单 (FDE 订单)
export interface CreatorServiceOrder {
  id: string;
  orderNo: string;
  clientName: string;
  clientCompany: string;
  clientAvatar: string;
  projectTitle: string;
  relatedAgentTitle?: string;
  contractAmount: number;
  platformFeeRate: number; // 平台抽成比如 10%
  netIncome: number; // 创作者净收益 90%
  currentMilestoneStage: number; // 当前阶段 1, 2, 3
  totalMilestones: number;
  milestones: Array<{
    title: string;
    amount: number;
    ratio: number;
    status: 'completed' | 'in_progress' | 'pending';
    deliveryProof?: string;
  }>;
  status: 'pending_quote' | 'in_escrow' | 'in_dev' | 'delivered' | 'completed' | 'disputed';
  createdAt: string;
  dueAt: string;
}

// 详细交易流水记录
export interface FinancialTransactionItem {
  id: string;
  orderNo: string;
  type: 'token_rebate' | 'agent_sale' | 'fde_service' | 'maintenance' | 'withdrawal' | 'platform_bonus' | 'tax_withholding';
  typeLabel: string;
  title: string;
  grossAmount: number; // 交易原始总金额 (元)
  splitRatio: number; // 分成比例 (如 0.20, 0.70, 0.90)
  platformFee: number; // 平台服务费 (元)
  taxAmount: number; // 预扣代缴个税/税费 (元)
  netAmount: number; // 创作者实际入账/出账 (元)
  relatedEntity: string; // 关联智能体/客户企业/提现银行
  clientName?: string;
  date: string; // 交易时间 (精确到秒)
  status: 'settled' | 'in_escrow' | 'processing' | 'completed' | 'failed';
  statusLabel: string;
  paymentChannel: string; // 结算通道 (如: 微信商户分账、支付宝企业专户、招商银行代发)
  proofHash: string; // 存证哈希 / 银行回单号
  tokenDetails?: {
    rechargeOrderNo: string; // 词元充值单号
    rechargeUser: string; // 充值客户/企业
    rechargePackage: string; // 充值算力包规格 (如 5000万词元企业包)
    rechargeTokens: number; // 充值词元数量
    rechargeAmount: number; // 客户实际充值金额 (元)
    rebateRate: number; // 创作者返点比例
  };
  fdeDetails?: {
    projectNo: string;
    milestoneName: string;
    milestoneRatio: number;
    acceptanceProof: string;
  };
  invoiceStatus?: 'issued' | 'pending' | 'not_applicable';
}

// 词元充值返点明细分项 (按用户充值金额返点，非调用次数)
export interface TokenRebateAgentBreakdown {
  agentId: string;
  agentTitle: string;
  coverImage: string;
  rechargePackageType: string; // 热门充值套餐/算力包类型 (如 "企业 5000万词元算力包")
  rechargeOrdersCount: number; // 带来充值订单笔数 (按充值笔数)
  rechargeTotalTokens: number; // 累计充值词元总量 (如 50,000,000 词元)
  rechargeTotalAmount: number; // 客户累计充值支付总额 (元)
  rebateRate: number; // 创作者返点比例 (10% - 20%)
  earnedRebate: number; // 累计获得充值返点现金 (元)
  lastRechargeTime: string; // 最近充值入账时间 (如 "10 分钟前")
}

// 软件售卖分项
export interface AgentSaleBreakdownItem {
  agentId: string;
  agentTitle: string;
  unitPrice: number;
  salesCount: number;
  grossAmount: number;
  platformFeeRate: number;
  creatorShareRate: number;
  netEarnings: number;
}

// 提现与打款明细
export interface WithdrawalRecordItem {
  id: string;
  withdrawNo: string;
  amount: number;
  fee: number;
  taxWithheld: number;
  actualArrival: number;
  bankName: string;
  accountTail: string;
  accountHolder: string;
  requestTime: string;
  arrivalTime: string;
  status: 'completed' | 'processing' | 'reviewing';
  bankTxnHash: string;
}

// 月度财务结算单
export interface MonthlySettlementStatement {
  month: string; // e.g. "2026-08"
  periodLabel: string;
  grossRevenue: number;
  tokenRebateIncome: number;
  agentSalesIncome: number;
  fdeServiceIncome: number;
  platformFeeDeducted: number;
  individualTaxWithheld: number;
  netIncome: number;
  settledStatus: 'settled' | 'settling' | 'pending';
  settledDate: string;
  statementNo: string;
}

// 创作者结算与财务总账
export interface CreatorWalletDetail {
  availableBalance: number; // 可提现余额
  pendingSettlement: number; // 待结算(托管中)
  totalHistoricalRevenue: number; // 累计总收入
  tokenRebateEarnings: number; // 词元返点累计收入
  paidAgentEarnings: number; // 付费版智能体收入
  fdeServiceEarnings: number; // FDE 服务订单收入
  withdrawnTotal: number; // 累计已提现金额
  individualTaxTotal: number; // 累计代扣代缴个人所得税
  bankAccount: {
    bankName: string;
    accountHolder: string;
    accountTail: string;
    alipayAccount: string;
  };
  records: FinancialTransactionItem[];
  tokenBreakdown: TokenRebateAgentBreakdown[];
  agentSalesBreakdown: AgentSaleBreakdownItem[];
  withdrawalHistory: WithdrawalRecordItem[];
  monthlyStatements: MonthlySettlementStatement[];
}

// 售后与申诉
export interface CreatorDisputeItem {
  id: string;
  orderNo: string;
  clientName: string;
  clientCompany: string;
  reason: string;
  clientDemand: string;
  fdeExplanation: string;
  evidenceFiles: string[];
  platformVerdict?: string;
  status: 'in_negotiation' | 'platform_investigating' | 'resolved';
  updatedAt: string;
}

// ------------------- 发布流程与 3 层校验体系类型 -------------------
export interface SkillFileEntry {
  name: string;
  size: string;
  status: 'valid' | 'warning' | 'error';
  note?: string;
  contentPreview?: string;
}

export interface SkillPackageManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  entrypoint: string;
  hermesMinVersion: string;
  permissions: string[];
  dependencies: { name: string; version: string }[];
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  confirmationNodes?: string[];
}

export interface VerificationCheckItem {
  id: string;
  name: string;
  category: 'structure' | 'hermes_compat' | 'sandbox';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  detail: string;
  elapsedMs?: number;
  errorMsg?: string;
}

// ------------------- 4.1 & 4.2 创作者与实名认证体系 -------------------
// 实名认证 7 种状态: 未认证 | 认证中 | 认证成功 | 认证失败 | 人工复核中 | 认证已失效 | 认证已撤销
export type RealNameVerifyStatus =
  | 'unverified'     // 未认证
  | 'in_progress'    // 认证中 (阿里云身份证与人脸比对)
  | 'verified'       // 认证成功
  | 'failed'         // 认证失败
  | 'manual_review'  // 人工复核中
  | 'expired'        // 认证已失效
  | 'revoked';       // 认证已撤销

export interface CreatorRealNameRecord {
  status: RealNameVerifyStatus;
  realName: string;
  idCardMasked: string;
  phoneMasked?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectReason?: string;
  aliyunVerifyId?: string;
}

// ------------------- 5. FDE 认证逻辑体系 -------------------
// 5.3 FDE 认证 5 种状态: 未满足条件 | 可申请 | 已认证 | 认证暂停 | 已撤销
export type FDECertStatus =
  | 'not_eligible'              // 未满足条件 (尚未实名认证或没有已发布可运行智能体)
  | 'eligible_pending_confirm'  // 可申请 (已满足认证条件，等待创作者确认规则)
  | 'certified'                 // 已认证 (可进入 FDE 专家集合页并接收咨询)
  | 'suspended'                 // 认证暂停 (下架宽限期7天中/版本失效/实名失效/调查中)
  | 'revoked';                  // 已撤销 (实名造假/恶意行为/严重违规)

export interface FDECertConditionCheck {
  realNameValid: boolean;             // 条件1: 实名认证有效 (verified)
  publishedHermesAgentsCount: number; // 条件2: 已发布且可运行的智能体数量 ≥ 1
  accountStatusNormal: boolean;       // 条件3: 账号状态正常 (未被封禁或投诉调查)
  agreedFdeRules: boolean;            // 条件4: 同意 FDE 展示及咨询规则
  isEligible: boolean;                // 是否满足自动认证资格 (1 & 2 & 3)
}

export interface FDESuspensionMetadata {
  reason: 'last_agent_offline' | 'hermes_incompatible' | 'realname_expired' | 'consultation_closed' | 'under_investigation';
  reasonLabel: string;
  occurredAt: string;
  gracePeriodDays: number; // 默认7天宽限期
  gracePeriodEndsAt?: string;
  remainingGraceDays?: number;
  isInGracePeriod: boolean;
}

export interface FDERevocationMetadata {
  reason: 'identity_fraud' | 'malicious_skill' | 'copyright_infringement' | 'bypass_platform_fraud' | 'severe_violation' | 'self_cancelled';
  reasonLabel: string;
  revokedAt: string;
  details: string;
}

// ------------------- 创作者主页真实案例 -------------------
export interface CreatorCaseStudyItem {
  id: string;
  title: string;
  clientName: string;
  industry: string;
  problem: string; // 业务痛点
  solution: string; // 解决方案
  outcome: string; // 产出结果
  roiMetrics: Array<{ label: string; value: string }>;
  createdAt: string;
}

// ------------------- 智能体真实运行评价 -------------------
export interface CreatorAgentReviewItem {
  id: string;
  agentId: string;
  agentTitle: string;
  userName: string;
  userAvatar: string;
  rating: number; // 1-5 星
  content: string;
  hasUsedBadge: boolean; // 必须成功运行后，带“已使用/已运行”标识
  runRecordId: string;
  createdAt: string;
  creatorReply?: {
    content: string;
    repliedAt: string;
    visibility: 'public' | 'private';
  };
  isReported?: boolean;
  reportReason?: string;
}

// ------------------- 平台内咨询线索 -------------------
export type InquiryLeadStatus = 'new' | 'communicating' | 'closed';

export interface PlatformInquiryMessage {
  id: string;
  sender: 'user' | 'creator';
  text: string;
  time: string;
}

export interface PlatformInquiryLead {
  id: string;
  userName: string;
  userCompany: string;
  userAvatar: string;
  industry: string;
  requirement: string;
  budgetRange: string;
  expectedTimeline: string;
  contactPhone: string;
  relatedAgentId?: string;
  relatedAgentTitle?: string;
  status: InquiryLeadStatus;
  createdAt: string;
  messages: PlatformInquiryMessage[];
}

export interface SandboxExecutionMetrics {
  avgExecutionTokens: number; // 单次调用预估消耗词元 (例如 1850 Tokens)
  avgExecutionCostYuan: number; // 单次推理底座实际成本 (例如 ￥0.038)
  p95LatencySec: number; // P95响应时延
  successRatePercent: number; // 测试集通过率 (如 100%)
  testedSamplesCount: number; // 跑通的标准测试样本数
  hermesVersionTested: string; // 测试所用 Hermes 引擎版本 (如 Hermes-Core v2.4.1)
  compatibilityRange: string; // 兼容范围 (如 Python 3.10+, Node 20+, ToolUse-v3)
}

export interface FixCenterIssue {
  id: string;
  stage: 'structure' | 'hermes_compat' | 'sandbox';
  stageName: string;
  title: string;
  severity: 'critical' | 'error' | 'warning';
  location: string; // 例如: SKILL.md:42 或 outputs.schema.json
  errorDetail: string; // 缺少什么/哪里不兼容/哪个节点无法唤起
  fixGuide: string; // 修复指导说明
  codeSnippet: string; // 可一键复制的修改补丁
  runtimeLog: string; // 运行时真实报错日志
  minimalReproInput: string; // 最小复现输入 Payload (JSON)
}

export interface ValidationHistoryRecord {
  id: string;
  version: string;
  packageName: string;
  timestamp: string;
  status: 'passed' | 'failed';
  tier1Status: 'passed' | 'failed';
  tier2Status: 'passed' | 'failed';
  tier3Status: 'passed' | 'failed';
  totalChecks: number;
  passedChecks: number;
  failedCount: number;
  metrics?: SandboxExecutionMetrics;
  issuesSummary?: string[];
}

export interface AgentPublishConfig {
  title: string;
  desc: string;
  category: string;
  coverEmoji: string;
  skillFileName: string;
  skillVersion: string;
  
  // 成本与商业定价机制 (基于真实沙箱精算)
  pricingModel: 'paid' | 'free';
  monthlyPrice: number; // 用户售价 (元/月)
  annualPrice: number; // 年付售价
  buyoutPrice: number; // 买断售价
  preferredPlan: 'monthly' | 'annual' | 'buyout';
  enableEnterpriseCustomization: boolean; // 是否开启 FDE 二开定制接单
  
  // 真实沙箱成本与收益推演
  metrics: SandboxExecutionMetrics;
  creatorShareRate: number; // 70% 软件授权分成
  tokenRebateRate: number; // 词元返点 (15%~20%)
  
  // 校验记录与签名
  verificationId: string;
  hermesEngineVersion: string;
}

