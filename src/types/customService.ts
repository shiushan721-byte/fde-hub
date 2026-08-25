import { DeliveryProposal } from './deliveryProposal';

export type CustomServiceStageKey =
  | 'consulting'
  | 'awaiting_proposal_confirm'
  | 'awaiting_payment'
  | 'in_delivery'
  | 'in_review'
  | 'pending_acceptance'
  | 'completed'
  | 'dispute'
  | 'closed'
  | 'unknown';

export type CustomServiceOrder = {
  id: string;
  orderNo: string;
  status: string;
  title: string;
  baseAgentId?: string;
  baseAgentTitle: string;
  baseAgentVersion: string;
  priceCents?: number;
  deliveryDays?: number;
  serviceScope?: string;
  quoteNote?: string;
  paymentStatus?: string;
  createdAt?: string;
  paymentDeadlineAt?: string;
  acceptanceDeadlineAt?: string;
  settlementEligibleAt?: string;
  deliveryProposal?: DeliveryProposal;
  proposalVersion?: number;
  proposalSubmittedAt?: string;
  settlementStatus?: string;
  disputeStatus?: string;
  disputeReason?: string;
  revisionQuota?: number;
  revisionsUsed?: number;
  creator?: { name?: string };
  buyer?: { name?: string; email?: string };
  instance?: { id: string; title: string; currentVersion: string } | null;
  deliveries?: Array<{ id: string; version: string; status: string; rejectReason?: string }>;
};

export type CustomServiceDeal = {
  dealId: string;
  leadId: string | null;
  orderId: string | null;
  stageKey: CustomServiceStageKey;
  stageLabel: string;
  clientName: string;
  clientCompany: string;
  clientAvatar?: string;
  agentId?: string;
  agentTitle: string;
  standardVersionAtRequest?: string;
  requirement: string;
  leadStatus?: string;
  consultedAt?: string;
  order: CustomServiceOrder | null;
};
