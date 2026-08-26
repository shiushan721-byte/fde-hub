export type VerifyType =
  | 'ai_expert'
  | 'level_1_expert'
  | 'level_2_expert'
  | 'level_3_expert'
  | 'real_name_creator'
  | 'verified_fde'
  | 'verified_creator'
  | 'enterprise_fde'
  | 'none';

export interface AgentPricingPlans {
  monthlyPrice?: number; // 按月付费 (元/月)
  annualPrice?: number;  // 按年付费 (元/年)
  buyoutPrice?: number;  // 终身买断 (元)
  isFree?: boolean;      // 免费开放使用
  preferredPlan?: 'monthly' | 'annual' | 'buyout';
}

export interface FDEExpert {
  id: string;
  /** 对外专家编号，如 AI-EXP-000001 */
  expertNo?: string;
  name: string;
  avatar: string;
  title: string;
  verifyType: VerifyType;
  verifyLabel: string;
  /** @deprecated 平台不再分专家等级，保留字段仅兼容旧数据 */
  expertLevel?: 1 | 2 | 3;
  roleTag: string;
  domainTags: string[];
  rating: number;
  ordersCount: number;
  praiseRate: number;
  responseTime: string;
  bio: string;
  location: string;
  serviceModes: string[];
  guarantees: string[];
  skills: string[];
  stats: {
    repeatRate: string;
    avgDeliveryDays: number;
    totalClientRevenue: string;
    validUsageCount?: number;
    hermesSuccessRate?: number;
    publishedAgentsCount?: number;
  };
  experienceYears: number;
  featuredQuote: string;
  /** 后台「设为推荐」；前台排序时推荐优先 */
  featured?: boolean;
  socialLinks?: {
    github?: string;
    wechat?: string;
    email?: string;
  };
  isFavorite?: boolean;
}

export interface AgentSolution {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorVerifyType: VerifyType;
  authorVerifyLabel: string;
  tags: string[];
  category: string;
  likesCount: number;
  usesCount: number;
  favoritesCount?: number;
  rating: number;
  description: string;
  capabilities: string[];
  samplePrompts: string[];
  systemPromptSnippet: string;
  businessIntegrationTips: string;
  priceFrom: number;
  pricingPlans?: AgentPricingPlans;
  isFavorite?: boolean;
  demoConversation: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface FDEServicePackage {
  id: string;
  expertId: string;
  title: string;
  desc: string;
  price: number;
  priceUnit: string;
  deliveryTime: string;
  deliverables: string[];
  suitableFor: string;
  features: string[];
  popularBadge?: string;
}

export interface CaseStudy {
  id: string;
  expertId: string;
  title: string;
  clientIndustry: string;
  clientName: string;
  /** @deprecated 不再在前台展示 */
  challenge?: string;
  solution: string;
  /** 产出结果：value=结果，label=说明；最多 4 条 */
  roiMetrics: Array<{
    label: string;
    value: string;
  }>;
  /** @deprecated 使用 images；保留兼容旧数据 */
  coverImage?: string;
  /** 案例配图，支持多张 */
  images?: string[];
  tags: string[];
}

export function getCaseStudyImages(c: Pick<CaseStudy, 'images' | 'coverImage'>): string[] {
  if (Array.isArray(c.images) && c.images.length > 0) {
    return c.images.filter(Boolean);
  }
  return c.coverImage ? [c.coverImage] : [];
}

export interface ClientReview {
  id: string;
  expertId: string;
  clientName: string;
  clientCompany: string;
  clientAvatar: string;
  rating: number;
  date: string;
  projectTitle: string;
  comment: string;
  tags: string[];
  verifiedOrder: boolean;
  /** 专家回复：公开会进主页口碑，不公开仅评价者可见并通过消息提醒送达 */
  expertReply?: {
    content: string;
    visibility: 'public' | 'private';
    repliedAt: string;
  };
}

export interface ConsultationFormState {
  expertId?: string;
  agentId?: string;
  businessProblem: string;
  referenceAgentTitle?: string;
  /** 发起咨询时的通用智能体标准版本，如 v2.0.0 */
  standardVersionAtRequest?: string;
  /** 定制需求场景：基于现有 / 新建通用 / 完全独立（平台外） */
  demandScenario?: 'based_on_existing' | 'new_universal' | 'fully_independent';
  /** 结构化定制规格（简化表单可不填，仅需求文案） */
  customizationSpec?: AgentCustomizationSpec;
  expectedTimeline?: string;
  serviceTypes?: string[];
  contactName: string;
  contactCompany: string;
  contactPhone: string;
  additionalNotes?: string;
}

/** 平台内智能体二次改造定制单（必须关联基础智能体） */
export interface AgentCustomizationSpec {
  unsatisfiedAreas: string;
  pagesToModify: string[];
  flowsToModify: string[];
  skillChanges?: string;
  additionalInputsOutputs: string;
  needsCustomerData: boolean;
  customerDataDescription?: string;
  needsThirdPartyIntegration: boolean;
  integrationsDescription?: string;
  audienceType: 'individual' | 'enterprise_members';
}

export interface MessageItem {
  id: string;
  sender: 'user' | 'fde' | 'system';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type?: 'text' | 'quote_proposal' | 'milestone_card' | 'quick_reply';
  proposalData?: {
    packageTitle: string;
    price: number;
    deliveryDays: number;
    milestones: string[];
    isAccepted?: boolean;
  };
}
