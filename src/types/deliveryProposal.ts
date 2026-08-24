/** 创作者发起的结构化定制交付方案 */
export interface DeliveryProposal {
  baseAgentId: string;
  baseAgentTitle: string;
  baseAgentVersion: string;
  /** 定制需求清单 */
  customizationItems: string[];
  /** 不包含的内容 */
  excludedItems: string[];
  /** 交付成果 */
  deliverables: string[];
  priceCents: number;
  deliveryDays: number;
  /** 免费修改次数 */
  freeRevisionCount: number;
  /** 验收标准 */
  acceptanceCriteria: string;
  /** 售后周期（天） */
  afterSalePeriodDays: number;
  needsCustomerData: boolean;
  customerDataNote?: string;
  needsThirdPartyAccess: boolean;
  thirdPartyNote?: string;
  /** 方案说明 / 备注 */
  note?: string;
  submittedAt?: string;
  version?: number;
}

export const PLATFORM_ESCROW_RULES =
  '资金由平台托管至验收完成；争议期间冻结结算；验收通过后进入待结算，扣除平台服务费后结算至创作者可提现余额。';

export function emptyDeliveryProposal(
  base: Partial<DeliveryProposal> = {}
): DeliveryProposal {
  return {
    baseAgentId: base.baseAgentId || '',
    baseAgentTitle: base.baseAgentTitle || '',
    baseAgentVersion: base.baseAgentVersion || 'v1.0.0',
    customizationItems: base.customizationItems || [],
    excludedItems: base.excludedItems || [],
    deliverables: base.deliverables || [],
    priceCents: base.priceCents || 0,
    deliveryDays: base.deliveryDays || 14,
    freeRevisionCount: base.freeRevisionCount ?? 2,
    acceptanceCriteria: base.acceptanceCriteria || '',
    afterSalePeriodDays: base.afterSalePeriodDays ?? 30,
    needsCustomerData: base.needsCustomerData ?? false,
    customerDataNote: base.customerDataNote,
    needsThirdPartyAccess: base.needsThirdPartyAccess ?? false,
    thirdPartyNote: base.thirdPartyNote,
    note: base.note,
    version: base.version ?? 1
  };
}
