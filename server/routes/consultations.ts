import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';
import { toJson } from '../lib/json';
import { createCustomOrder, mapOrder } from '../services/customOrder';

export const consultationRouter = Router();

const createLeadSchema = z.object({
  contactName: z.string().optional(),
  contactCompany: z.string().optional(),
  contactPhone: z.string().optional(),
  businessProblem: z.string().optional(),
  additionalNotes: z.string().optional(),
  agentId: z.string().optional(),
  referenceAgentTitle: z.string().optional(),
  expertId: z.string().optional(),
  customizationSpec: z.any().optional(),
  /** 基于通用智能体的二次定制：创建正式订单 */
  createCustomOrder: z.boolean().optional(),
  baseAgentVersion: z.string().optional(),
  deliveryDays: z.number().int().optional(),
  priceCents: z.number().int().optional()
});

consultationRouter.post('/', async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, '咨询内容不完整');

  const data = parsed.data;
  const id = `lead_${Date.now()}`;
  const text =
    data.additionalNotes?.trim() ||
    data.businessProblem ||
    '已提交定制需求，请查看规格。';

  const lead = await prisma.consultationLead.create({
    data: {
      id,
      clientName: data.contactName || '企业客户',
      clientCompany: data.contactCompany || '未填写企业',
      clientAvatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      expertId: data.expertId,
      agentId: data.agentId || '',
      agentTitle: data.referenceAgentTitle || (data.agentId ? '未指定智能体' : '直接向专家咨询'),
      summary: data.businessProblem || '',
      contactPhone: data.contactPhone || '',
      status: 'new',
      notes: data.businessProblem || '',
      payload: toJson(data),
      userId: req.user?.id,
      messages: {
        create: {
          id: `msg_${Date.now()}`,
          sender: 'user',
          senderName: data.contactName || '企业客户',
          text
        }
      }
    },
    include: { messages: true }
  });

  let customOrder = null;
  const shouldCreateOrder =
    Boolean(data.createCustomOrder ?? data.customizationSpec) &&
    Boolean(data.agentId) &&
    Boolean(req.user?.id);

  if (shouldCreateOrder && req.user?.id && data.agentId) {
    try {
      customOrder = await createCustomOrder({
        buyerUserId: req.user.id,
        expertId: data.expertId,
        baseAgentId: data.agentId,
        baseAgentTitle: data.referenceAgentTitle || '定制智能体',
        baseAgentVersion: data.baseAgentVersion || 'v1.0.0',
        title: `定制 · ${data.referenceAgentTitle || data.agentId}`,
        customizationSpec: data.customizationSpec || {},
        priceCents: data.priceCents,
        deliveryDays: data.deliveryDays,
        serviceScope: data.businessProblem || '',
        leadId: lead.id
      });
    } catch (error) {
      return fail(
        res,
        error instanceof Error ? error.message : '咨询已保存，但定制订单创建失败'
      );
    }
  }

  return ok(
    res,
    {
      lead,
      customOrder: customOrder ? mapOrder(customOrder) : null
    },
    201
  );
});
