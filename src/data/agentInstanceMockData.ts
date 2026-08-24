import { CustomerAgentInstance, StandardAgentVersion } from '../types/creator';

/** GEO 助手标准版版本演进 */
export const mockGeoStandardVersions: StandardAgentVersion[] = [
  {
    version: 'v1.0.0',
    releaseNotes: '基础关键词生成与 GEO 文章草稿',
    releasedAt: '2025-11-01',
    hermesValidated: true,
    isLatest: false
  },
  {
    version: 'v2.0.0',
    releaseNotes: '新增 AI 可见度检测与批量长尾词矩阵',
    releasedAt: '2026-03-15',
    hermesValidated: true,
    isLatest: false
  },
  {
    version: 'v3.0.0',
    releaseNotes: '支持 Perplexity / ChatGPT 品牌提及率追踪',
    releasedAt: '2026-07-20',
    hermesValidated: true,
    isLatest: true
  }
];

/** 各通用智能体当前标准版本（普通用户始终使用 isLatest 版本） */
export const universalAgentStandardVersions: Record<string, { current: string; history: string[] }> = {
  'geo-helper': { current: 'v3.0.0', history: ['v1.0.0', 'v2.0.0', 'v3.0.0'] },
  'agent-ecommerce-service': { current: 'v2.1.0', history: ['v1.0.0', 'v2.0.0', 'v2.1.0'] },
  'agent-video-growth': { current: 'v2.0.0', history: ['v1.0.0', 'v2.0.0'] },
  'hz-canvas': { current: 'v1.2.0', history: ['v1.0.0', 'v1.1.0', 'v1.2.0'] }
};

export function getStandardVersionForAgent(agentId: string): string {
  return universalAgentStandardVersions[agentId]?.current || 'v1.0.0';
}

/** FDE 侧：已创建的客户专属实例 */
export const mockCustomerAgentInstances: CustomerAgentInstance[] = [
  {
    id: 'inst_geo_brand_a',
    title: 'GEO 助手 · 美妆 DTC 出海品牌专属',
    baseAgentId: 'geo-helper',
    baseAgentTitle: 'GEO助手',
    basedOnStandardVersion: 'v2.0.0',
    latestStandardVersionAvailable: 'v3.0.0',
    createdByFdeId: 'fde-maya',
    createdByFdeName: 'Maya (苏晴)',
    customerId: 'client_wang',
    customerName: '王经理',
    customerCompany: '美妆 DTC 出海品牌',
    boundSkillVersion: 'skill_geo_brand_a_v2.0.1',
    status: 'active',
    visibility: 'customer_only',
    customizations: {
      pagesModified: ['品牌词库管理页', '多语种输出配置页'],
      flowsModified: ['Perplexity 抓取流程', '英文长尾词生成流程'],
      skillModified: true,
      promptsModified: true,
      dataSources: ['品牌官方素材库 CSV', '竞品词表'],
      integrations: ['Shopify 产品 API']
    },
    upgradeReminder: {
      message: '通用标准版已升级至 v3.0.0（含 ChatGPT 品牌提及率追踪），专属实例仍基于 v2.0.0 运行，是否吸收新能力需 FDE 单独评估。',
      latestStandardVersion: 'v3.0.0'
    },
    relatedLeadId: 'lead_002',
    createdAt: '2026-06-10',
    updatedAt: '2026-08-01'
  },
  {
    id: 'inst_ecom_cs_brand_b',
    title: '电商客服自愈 · 杭州服饰品牌专属',
    baseAgentId: 'agent-ecommerce-service',
    baseAgentTitle: '电商全渠道智能客服与售后自愈助手',
    basedOnStandardVersion: 'v2.0.0',
    latestStandardVersionAvailable: 'v2.1.0',
    createdByFdeId: 'fde-linran',
    createdByFdeName: '林然',
    customerId: 'client_zhang',
    customerName: '张总',
    customerCompany: '杭州某头部服饰电商品牌',
    boundSkillVersion: 'skill_ecom_cs_zhang_v2.0.3',
    status: 'active',
    visibility: 'customer_only',
    customizations: {
      pagesModified: ['售后工单看板', 'ERP 联调状态页'],
      flowsModified: ['聚水潭订单拦截流程', '菜鸟裹裹上门取件流程'],
      skillModified: true,
      promptsModified: false,
      dataSources: ['聚水潭 ERP 订单库'],
      integrations: ['聚水潭 API', '企业微信客服']
    },
    upgradeReminder: {
      message: '标准版 v2.1.0 已发布尺码推荐优化，专属实例未自动升级。',
      latestStandardVersion: 'v2.1.0'
    },
    relatedLeadId: 'lead_001',
    createdAt: '2026-05-20',
    updatedAt: '2026-07-28'
  },
  {
    id: 'inst_geo_draft_new',
    title: 'GEO 助手 · 某 SaaS 企业专属（草稿）',
    baseAgentId: 'geo-helper',
    baseAgentTitle: 'GEO助手',
    basedOnStandardVersion: 'v3.0.0',
    createdByFdeId: 'fde-maya',
    createdByFdeName: 'Maya (苏晴)',
    customerId: 'client_li',
    customerName: '李工',
    customerCompany: '苏州精工机械制造有限公司',
    boundSkillVersion: 'skill_geo_saas_draft',
    status: 'draft',
    visibility: 'customer_only',
    customizations: {
      pagesModified: ['工业术语词库页'],
      flowsModified: ['B2B 长尾词挖掘流程'],
      skillModified: true,
      promptsModified: true,
      dataSources: ['产品白皮书 PDF'],
      integrations: []
    },
    createdAt: '2026-08-18',
    updatedAt: '2026-08-18'
  }
];

/** 用户侧：当前登录用户可用的专属智能体（按 customerId 过滤） */
export const mockUserExclusiveAgents: CustomerAgentInstance[] = mockCustomerAgentInstances.filter(
  (i) => i.status === 'active'
);
