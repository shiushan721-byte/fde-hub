import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';

const BUYER_ID = 'user-demo';
const CREATOR_ID = 'user-fde-linran';
const EXPERT_ID = 'fde-linran';
const AGENT_ID = 'agent-ecommerce-service';
const AGENT_TITLE = '电商全渠道智能客服与售后自愈助手';
const SHOWCASE_ID = 'ash_insp_geo-helper_weekly';
const SHOWCASE_TITLE = '品牌 AI 可见度监测周报';
const LEAD_ID = 'lead_demo_inbox';
const ORDER_CONSULT = 'cord_demo_awaiting_proposal';
const ORDER_PAY = 'cord_demo_awaiting_pay';
const ORDER_ACCEPT = 'cord_demo_pending_accept';
const INSTANCE_ACCEPT = 'inst_demo_pending_accept';

type SeedNote = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  payload: Record<string, unknown>;
  hoursAgo: number;
};

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function ensureDemoConsultLead() {
  const existing = await prisma.consultationLead.findUnique({ where: { id: LEAD_ID } });
  if (existing) return;
  await prisma.consultationLead.create({
    data: {
      id: LEAD_ID,
      clientName: '演示用户',
      clientCompany: '演示公司',
      clientAvatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      expertId: EXPERT_ID,
      agentId: AGENT_ID,
      agentTitle: AGENT_TITLE,
      summary: '希望基于电商客服助手做二次定制，覆盖退换货与大促峰值分流。',
      notes: '希望基于电商客服助手做二次定制，覆盖退换货与大促峰值分流。',
      status: 'contacted',
      userId: BUYER_ID,
      payload: toJson({
        agentId: AGENT_ID,
        expertId: EXPERT_ID,
        source: 'inbox-seed'
      }),
      messages: {
        create: [
          {
            id: 'msg_demo_inbox_user',
            sender: 'user',
            senderName: '演示用户',
            text: '希望基于电商客服助手做二次定制，覆盖退换货与大促峰值分流。'
          },
          {
            id: 'msg_demo_inbox_creator',
            sender: 'creator',
            senderName: '林然',
            text: '收到需求。我们先对齐范围，确认后我会发起定制交付方案。'
          }
        ]
      }
    }
  });
}

function buyerNotes(): SeedNote[] {
  return [
    {
      id: 'ntf_seed_buyer_agent_comment_reply',
      userId: BUYER_ID,
      type: 'agent_comment_reply',
      title: `作者回复了你在「${AGENT_TITLE}」的评论`,
      body: '林然：感谢反馈，退换货分支会在下一版补上。',
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 1
    },
    {
      id: 'ntf_seed_buyer_showcase_reply',
      userId: BUYER_ID,
      type: 'showcase_reply',
      title: `有人回复了你在成果「${SHOWCASE_TITLE}」的评论`,
      body: '程璐：这周报可以直接拿去市场例会讲。',
      link: `/inspiration/${SHOWCASE_ID}`,
      payload: { showcaseId: SHOWCASE_ID },
      hoursAgo: 3
    },
    {
      id: 'ntf_seed_buyer_realname_verified',
      userId: BUYER_ID,
      type: 'realname_verified',
      title: '实名认证已通过',
      body: '你已完成实名核验，可以继续申请成为 AI 专家。',
      link: '/creator-center?tab=account',
      payload: {},
      hoursAgo: 20
    },
    {
      id: 'ntf_seed_buyer_realname_rejected',
      userId: BUYER_ID,
      type: 'realname_rejected',
      title: '实名认证未通过',
      body: '证件照片模糊，请核对姓名与证件信息后重新提交。',
      link: '/creator-center?tab=account',
      payload: {},
      hoursAgo: 48
    },
    {
      id: 'ntf_seed_buyer_app_submitted',
      userId: BUYER_ID,
      type: 'expert_application_submitted',
      title: 'AI 专家入驻申请已提交',
      body: '运营将在 1–2 个工作日内完成审核，结果会通过站内信通知你。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'onboarding' },
      hoursAgo: 30
    },
    {
      id: 'ntf_seed_buyer_app_supplement',
      userId: BUYER_ID,
      type: 'expert_application_supplement',
      title: '入驻申请需补充资料',
      body: '请补充可运行智能体的 Hermes 校验截图后再提交。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'onboarding' },
      hoursAgo: 28
    },
    {
      id: 'ntf_seed_buyer_app_approved',
      userId: BUYER_ID,
      type: 'expert_application_approved',
      title: '恭喜，你已通过 AI 专家入驻审核',
      body: '你已成为 HelloMe AI 专家，可以发布智能体并承接定制服务。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'onboarding' },
      hoursAgo: 18
    },
    {
      id: 'ntf_seed_buyer_onboarding',
      userId: BUYER_ID,
      type: 'onboarding',
      title: '欢迎入驻 HelloMe AI 专家',
      body: '完善主页资料并发布第一个可运行智能体后，即可接收咨询。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'onboarding' },
      hoursAgo: 17
    },
    {
      id: 'ntf_seed_buyer_app_rejected',
      userId: BUYER_ID,
      type: 'expert_application_rejected',
      title: 'AI 专家入驻申请未通过',
      body: '公开作品数量不足，请发布至少一个经 Hermes 校验的智能体后重试。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'onboarding' },
      hoursAgo: 72
    },
    {
      id: 'ntf_seed_buyer_upgrade',
      userId: BUYER_ID,
      type: 'upgrade',
      title: '专家晋升申请已通过',
      body: '晋升申请已审核通过，可继续在创作者中心使用专家能力。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'upgrade' },
      hoursAgo: 40
    },
    {
      id: 'ntf_seed_buyer_report_submitted',
      userId: BUYER_ID,
      type: 'comment_report_submitted',
      title: '举报已受理',
      body: '您举报的评论已提交，平台核实后将通过站内信告知处理结果。',
      link: '',
      payload: { agentId: AGENT_ID, reason: 'spam' },
      hoursAgo: 8
    },
    {
      id: 'ntf_seed_buyer_report_dismissed',
      userId: BUYER_ID,
      type: 'comment_report_dismissed',
      title: '举报处理结果',
      body: `您举报的评论经核实暂未发现违规，已作忽略处理。智能体：${AGENT_TITLE}`,
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID },
      hoursAgo: 6
    },
    {
      id: 'ntf_seed_buyer_report_removed',
      userId: BUYER_ID,
      type: 'comment_report_removed',
      title: '举报处理结果',
      body: `您举报的评论已核实并删除，感谢反馈。智能体：${AGENT_TITLE}`,
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID },
      hoursAgo: 5
    },
    {
      id: 'ntf_seed_buyer_catalog_paid',
      userId: BUYER_ID,
      type: 'catalog_purchase_paid',
      title: '智能体使用权购买成功',
      body: `你已获得「${AGENT_TITLE}」标准版使用权，可立即使用。`,
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 12
    },
    {
      id: 'ntf_seed_buyer_adapter_paid',
      userId: BUYER_ID,
      type: 'adapter_purchase_paid',
      title: 'Skill / 适配包购买成功',
      body: `你已购买「${AGENT_TITLE}」的 企微接待适配包，可前往智能体详情下载。`,
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE, packageName: '企微接待适配包' },
      hoursAgo: 11
    },
    {
      id: 'ntf_seed_buyer_consult_submitted',
      userId: BUYER_ID,
      type: 'consult_submitted',
      title: '定制需求已提交',
      body: `「${AGENT_TITLE}」已发给创作者。有进展时会在消息中提醒你。`,
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID, agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 4
    },
    {
      id: 'ntf_seed_buyer_consult_contacted',
      userId: BUYER_ID,
      type: 'consult_contacted',
      title: '创作者已开始联系',
      body: AGENT_TITLE,
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID },
      hoursAgo: 3.5
    },
    {
      id: 'ntf_seed_buyer_consult_replied',
      userId: BUYER_ID,
      type: 'consult_replied',
      title: '创作者回复了你的咨询',
      body: '收到需求。我们先对齐范围，确认后我会发起定制交付方案。',
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID },
      hoursAgo: 3.2
    },
    {
      id: 'ntf_seed_buyer_consult_closed',
      userId: BUYER_ID,
      type: 'consult_closed',
      title: '创作者已关闭咨询',
      body: AGENT_TITLE,
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID },
      hoursAgo: 96
    },
    {
      id: 'ntf_seed_buyer_proposal_ready',
      userId: BUYER_ID,
      type: 'delivery_proposal_ready',
      title: '创作者已发起定制交付方案，请确认',
      body: 'CUS-DEMO-003 · ¥8,800.00 · 14 天',
      link: `/consult?dealId=${ORDER_CONSULT}`,
      payload: { dealId: ORDER_CONSULT, orderId: ORDER_CONSULT },
      hoursAgo: 2
    },
    {
      id: 'ntf_seed_buyer_delivery_ready',
      userId: BUYER_ID,
      type: 'delivery_ready',
      title: '专属智能体审核已通过',
      body: '大促峰值分流策略定制 v1.0 已通过平台审核并推送到您的工作台，请验收。',
      link: `/workspace?instanceId=${INSTANCE_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT, instanceId: INSTANCE_ACCEPT },
      hoursAgo: 10
    },
    {
      id: 'ntf_seed_buyer_delivery_rejected',
      userId: BUYER_ID,
      type: 'delivery_review_rejected',
      title: '专属智能体审核未通过',
      body: '首版交付未通过平台审核：退换货分支未覆盖七天无理由场景。',
      link: '/order-center',
      payload: { orderId: 'cord_demo_revision' },
      hoursAgo: 26
    },
    {
      id: 'ntf_seed_buyer_accept_day1',
      userId: BUYER_ID,
      type: 'acceptance_reminder_day1',
      title: '验收提醒 · 专属智能体已送达第 1 天',
      body: 'CUS-DEMO-007 请尽快试用并确认验收。',
      link: `/orders?orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT, reminder: 'day1' },
      hoursAgo: 9
    },
    {
      id: 'ntf_seed_buyer_accept_day5',
      userId: BUYER_ID,
      type: 'acceptance_reminder_day5',
      title: '验收提醒 · 还剩约 2 天',
      body: 'CUS-DEMO-007 若无异议，到期将自动验收并进入结算。',
      link: `/orders?orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT, reminder: 'day5' },
      hoursAgo: 14
    },
    {
      id: 'ntf_seed_buyer_accept_day7',
      userId: BUYER_ID,
      type: 'acceptance_reminder_day7',
      title: '验收提醒 · 即将自动验收',
      body: 'CUS-DEMO-007 将在约 12 小时内自动验收，如有问题请尽快申请修改或发起争议。',
      link: `/orders?orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT, reminder: 'day7' },
      hoursAgo: 16
    },
    {
      id: 'ntf_seed_buyer_auto_accepted',
      userId: BUYER_ID,
      type: 'order_auto_accepted',
      title: '订单已自动验收',
      body: 'CUS-DEMO-008 · 验收期结束且无异议',
      link: `/orders?orderId=cord_demo_pending_settlement`,
      payload: { orderId: 'cord_demo_pending_settlement' },
      hoursAgo: 36
    },
    {
      id: 'ntf_seed_buyer_pay_timeout',
      userId: BUYER_ID,
      type: 'order_closed_payment_timeout',
      title: '订单已因超时未付款关闭',
      body: `${ORDER_PAY} · 创作者无需交付`,
      link: `/orders?orderId=${ORDER_PAY}`,
      payload: { orderId: ORDER_PAY },
      hoursAgo: 60
    },
    {
      id: 'ntf_seed_buyer_dispute_resolved',
      userId: BUYER_ID,
      type: 'dispute_resolved',
      title: '争议判定：继续修改交付',
      body: 'CUS-DEMO-007 · 请按判定意见继续验收',
      link: `/orders?orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT },
      hoursAgo: 22
    },
    {
      id: 'ntf_seed_buyer_intervention',
      userId: BUYER_ID,
      type: 'platform_intervention',
      title: '平台介入 · 正在处理',
      body: 'CUS-DEMO-004：运营已介入核对交付范围。',
      link: `/orders?orderId=${ORDER_PAY}`,
      payload: { orderId: ORDER_PAY, status: 'processing' },
      hoursAgo: 7
    }
  ];
}

function creatorNotes(): SeedNote[] {
  return [
    {
      id: 'ntf_seed_creator_agent_like',
      userId: CREATOR_ID,
      type: 'agent_like',
      title: `有人赞了你的智能体「${AGENT_TITLE}」`,
      body: '演示用户 点赞了你的智能体。',
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 0.8
    },
    {
      id: 'ntf_seed_creator_agent_favorite',
      userId: CREATOR_ID,
      type: 'agent_favorite',
      title: `有人收藏了你的智能体「${AGENT_TITLE}」`,
      body: '演示用户 收藏了你的智能体。',
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 1.2
    },
    {
      id: 'ntf_seed_creator_agent_comment',
      userId: CREATOR_ID,
      type: 'agent_comment',
      title: `有人评论了你的智能体「${AGENT_TITLE}」`,
      body: '演示用户：退换货分支能不能覆盖七天无理由？',
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 2.1
    },
    {
      id: 'ntf_seed_creator_agent_comment_reply',
      userId: CREATOR_ID,
      type: 'agent_comment_reply',
      title: `作者回复了你在「救急文书工坊」的评论`,
      body: '林然：这份董事会请示模板可以直接套。',
      link: '/agent/doc-emergency',
      payload: { agentId: 'doc-emergency', agentTitle: '救急文书工坊' },
      hoursAgo: 15
    },
    {
      id: 'ntf_seed_creator_follow',
      userId: CREATOR_ID,
      type: 'expert_follow',
      title: '新粉丝关注了你',
      body: '用户 演示用户 关注了你的专家主页。',
      link: `/expert/${EXPERT_ID}`,
      payload: { expertId: EXPERT_ID },
      hoursAgo: 1.5
    },
    {
      id: 'ntf_seed_creator_showcase_like',
      userId: CREATOR_ID,
      type: 'showcase_like',
      title: '有人点赞了你的成果',
      body: `演示用户 赞了「${SHOWCASE_TITLE}」`,
      link: `/inspiration/${SHOWCASE_ID}`,
      payload: { showcaseId: SHOWCASE_ID },
      hoursAgo: 2.4
    },
    {
      id: 'ntf_seed_creator_showcase_comment',
      userId: CREATOR_ID,
      type: 'showcase_comment',
      title: `有人评论了你的成果「${SHOWCASE_TITLE}」`,
      body: '演示用户：这周报结构很清楚。',
      link: `/inspiration/${SHOWCASE_ID}`,
      payload: { showcaseId: SHOWCASE_ID },
      hoursAgo: 2.6
    },
    {
      id: 'ntf_seed_creator_showcase_reply',
      userId: CREATOR_ID,
      type: 'showcase_reply',
      title: `有人回复了你在成果「${SHOWCASE_TITLE}」的评论`,
      body: '程璐：下周可以把竞品对比也放进去。',
      link: `/inspiration/${SHOWCASE_ID}`,
      payload: { showcaseId: SHOWCASE_ID },
      hoursAgo: 4
    },
    {
      id: 'ntf_seed_creator_showcase_featured',
      userId: CREATOR_ID,
      type: 'showcase_featured',
      title: `你的成果「${SHOWCASE_TITLE}」被设为精选`,
      body: `运营 将你在「GEO助手」上传的成果设为精选。`,
      link: `/inspiration/${SHOWCASE_ID}`,
      payload: { showcaseId: SHOWCASE_ID },
      hoursAgo: 8
    },
    {
      id: 'ntf_seed_creator_review_approved',
      userId: CREATOR_ID,
      type: 'agent_review_approved',
      title: '通用智能体审核已通过',
      body: `「${AGENT_TITLE}」已通过平台审核并上架。`,
      link: `/agent/${AGENT_ID}`,
      payload: { agentId: AGENT_ID },
      hoursAgo: 24
    },
    {
      id: 'ntf_seed_creator_review_rejected',
      userId: CREATOR_ID,
      type: 'agent_review_rejected',
      title: '通用智能体审核未通过',
      body: '「应急话术包」被驳回：缺少 Hermes 校验报告。',
      link: '/creator-center?tab=my-agents',
      payload: {},
      hoursAgo: 30
    },
    {
      id: 'ntf_seed_creator_offline',
      userId: CREATOR_ID,
      type: 'agent_offline',
      title: '您的智能体已被平台下架',
      body: '您的智能体「过期促销助手」已从智能体市场下架，当前仅自己可用。',
      link: '/creator-center?tab=my-agents',
      payload: {},
      hoursAgo: 50
    },
    {
      id: 'ntf_seed_creator_realname_verified',
      userId: CREATOR_ID,
      type: 'realname_verified',
      title: '实名认证已通过',
      body: '你已完成实名核验，专家主页可对外展示。',
      link: '/creator-center?tab=account',
      payload: {},
      hoursAgo: 80
    },
    {
      id: 'ntf_seed_creator_upgrade',
      userId: CREATOR_ID,
      type: 'upgrade',
      title: '专家晋升申请已通过',
      body: '晋升申请已审核通过，可继续在创作者中心使用专家能力。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'upgrade' },
      hoursAgo: 44
    },
    {
      id: 'ntf_seed_creator_app_submitted',
      userId: CREATOR_ID,
      type: 'expert_application_submitted',
      title: '专家晋升申请已提交',
      body: '运营将在 1–2 个工作日内完成审核，结果会通过站内信通知你。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'upgrade' },
      hoursAgo: 46
    },
    {
      id: 'ntf_seed_creator_app_supplement',
      userId: CREATOR_ID,
      type: 'expert_application_supplement',
      title: '晋升申请需补充资料',
      body: '请补充近 30 天有效运行数据后再提交。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'upgrade' },
      hoursAgo: 45
    },
    {
      id: 'ntf_seed_creator_app_rejected',
      userId: CREATOR_ID,
      type: 'expert_application_rejected',
      title: '专家晋升申请未通过',
      body: '近 30 天有效咨询转化不足，请继续运营后再申请。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'upgrade' },
      hoursAgo: 90
    },
    {
      id: 'ntf_seed_creator_onboarding',
      userId: CREATOR_ID,
      type: 'onboarding',
      title: '欢迎入驻 HelloMe AI 专家',
      body: '完善主页资料并保持智能体可运行，即可持续接收咨询。',
      link: '/creator-center?tab=account',
      payload: { applicationType: 'onboarding' },
      hoursAgo: 100
    },
    {
      id: 'ntf_seed_creator_sale',
      userId: CREATOR_ID,
      type: 'order_settled_notice',
      title: '标准版销售收入已入账',
      body: `「${AGENT_TITLE}」成交 ¥199.00，收益将按规则进入待结算。`,
      link: '/creator-center?tab=account',
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 12
    },
    {
      id: 'ntf_seed_creator_adapter_sale',
      userId: CREATOR_ID,
      type: 'order_settled_notice',
      title: '适配包销售收入已入账',
      body: `「${AGENT_TITLE}」成交 ¥99.00，收益将按规则进入待结算。`,
      link: '/creator-center?tab=account',
      payload: { agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 11
    },
    {
      id: 'ntf_seed_creator_withdraw_paid',
      userId: CREATOR_ID,
      type: 'withdrawal_paid',
      title: '提现已打款',
      body: '¥1,280.00 已打款至你绑定的账户。',
      link: '/creator-center?tab=account',
      payload: {},
      hoursAgo: 33
    },
    {
      id: 'ntf_seed_creator_withdraw_rejected',
      userId: CREATOR_ID,
      type: 'withdrawal_rejected',
      title: '提现申请未通过',
      body: '¥500.00 已退回可提现余额。原因：收款账户姓名与实名不一致。',
      link: '/creator-center?tab=account',
      payload: {},
      hoursAgo: 55
    },
    {
      id: 'ntf_seed_creator_consult_submitted',
      userId: CREATOR_ID,
      type: 'consult_submitted',
      title: '新的定制咨询',
      body: `演示用户 · ${AGENT_TITLE}`,
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID, agentId: AGENT_ID, agentTitle: AGENT_TITLE },
      hoursAgo: 4
    },
    {
      id: 'ntf_seed_creator_consult_contacted',
      userId: CREATOR_ID,
      type: 'consult_contacted',
      title: '客户已开始联系',
      body: AGENT_TITLE,
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID },
      hoursAgo: 3.4
    },
    {
      id: 'ntf_seed_creator_consult_replied',
      userId: CREATOR_ID,
      type: 'consult_replied',
      title: '客户回复了咨询',
      body: '好的，请先出一版交付范围和报价。',
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID },
      hoursAgo: 3
    },
    {
      id: 'ntf_seed_creator_consult_closed',
      userId: CREATOR_ID,
      type: 'consult_closed',
      title: '客户已关闭咨询',
      body: AGENT_TITLE,
      link: `/consult?dealId=${LEAD_ID}`,
      payload: { dealId: LEAD_ID, leadId: LEAD_ID },
      hoursAgo: 96
    },
    {
      id: 'ntf_seed_creator_pending_quote',
      userId: CREATOR_ID,
      type: 'custom_order_pending_quote',
      title: '新的定制订单待报价',
      body: `CUS-DEMO-001 · ${AGENT_TITLE}`,
      link: `/consult?dealId=cord_demo_pending_quote`,
      payload: { dealId: 'cord_demo_pending_quote', orderId: 'cord_demo_pending_quote' },
      hoursAgo: 6
    },
    {
      id: 'ntf_seed_creator_proposal_confirmed',
      userId: CREATOR_ID,
      type: 'proposal_confirmed',
      title: '用户已确认交付方案，等待付款',
      body: 'CUS-DEMO-004',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_PAY}`,
      payload: { orderId: ORDER_PAY },
      hoursAgo: 5
    },
    {
      id: 'ntf_seed_creator_proposal_rejected',
      userId: CREATOR_ID,
      type: 'proposal_rejected',
      title: '用户拒绝了交付方案',
      body: '价格超出预算，请修改后重新发起',
      link: `/consult?dealId=${ORDER_CONSULT}`,
      payload: { dealId: ORDER_CONSULT, orderId: ORDER_CONSULT },
      hoursAgo: 19
    },
    {
      id: 'ntf_seed_creator_proposal_revision',
      userId: CREATOR_ID,
      type: 'proposal_revision_requested',
      title: '用户要求修改交付方案',
      body: '请把大促峰值分流单独列为交付项，并给出验收标准。',
      link: `/consult?dealId=${ORDER_CONSULT}`,
      payload: { dealId: ORDER_CONSULT, orderId: ORDER_CONSULT },
      hoursAgo: 18
    },
    {
      id: 'ntf_seed_creator_escrowed',
      userId: CREATOR_ID,
      type: 'custom_order_escrowed',
      title: '平台已托管到账，请开始开发',
      body: 'CUS-DEMO-005 · 资金已托管 · 专属实例已创建',
      link: '/creator-center?tab=custom-services&orderId=cord_demo_escrowed',
      payload: { orderId: 'cord_demo_escrowed' },
      hoursAgo: 21
    },
    {
      id: 'ntf_seed_creator_delivery_approved',
      userId: CREATOR_ID,
      type: 'delivery_review_approved',
      title: '交付智能体审核已通过',
      body: '「大促峰值分流策略定制」v1.0 已通过平台审核，并已推送给客户。',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT },
      hoursAgo: 10
    },
    {
      id: 'ntf_seed_creator_delivery_rejected',
      userId: CREATOR_ID,
      type: 'delivery_review_rejected',
      title: '交付智能体审核未通过',
      body: '「退换货助手定制」v1.0 被驳回：未覆盖七天无理由场景。',
      link: '/creator-center?tab=custom-services&orderId=cord_demo_revision',
      payload: { orderId: 'cord_demo_revision' },
      hoursAgo: 26
    },
    {
      id: 'ntf_seed_creator_revision',
      userId: CREATOR_ID,
      type: 'revision_requested',
      title: '客户申请修改交付',
      body: '请补充大促峰值看板的告警阈值说明。',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT },
      hoursAgo: 9
    },
    {
      id: 'ntf_seed_creator_accepted',
      userId: CREATOR_ID,
      type: 'order_accepted',
      title: '客户已验收，进入待结算',
      body: 'CUS-DEMO-008 · 约 24 小时后结算',
      link: '/creator-center?tab=custom-services&orderId=cord_demo_pending_settlement',
      payload: { orderId: 'cord_demo_pending_settlement' },
      hoursAgo: 36
    },
    {
      id: 'ntf_seed_creator_settled',
      userId: CREATOR_ID,
      type: 'order_settled',
      title: '定制订单已完成结算',
      body: 'CUS-DEMO-009 · 收益已按 T+7 规则进入可提现（已扣平台服务费）',
      link: '/creator-center?tab=custom-services&orderId=cord_demo_completed',
      payload: { orderId: 'cord_demo_completed' },
      hoursAgo: 70
    },
    {
      id: 'ntf_seed_creator_pay_timeout',
      userId: CREATOR_ID,
      type: 'order_closed_payment_timeout',
      title: '用户超时未付款，订单已关闭',
      body: 'CUS-DEMO-004',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_PAY}`,
      payload: { orderId: ORDER_PAY },
      hoursAgo: 60
    },
    {
      id: 'ntf_seed_creator_dispute_opened',
      userId: CREATOR_ID,
      type: 'dispute_opened',
      title: '客户发起订单争议',
      body: '交付未覆盖合同中的峰值分流看板。',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT },
      hoursAgo: 23
    },
    {
      id: 'ntf_seed_creator_dispute_resolved',
      userId: CREATOR_ID,
      type: 'dispute_resolved',
      title: '争议判定：继续修改交付',
      body: 'CUS-DEMO-007 · 请按判定意见补充交付',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT },
      hoursAgo: 22
    },
    {
      id: 'ntf_seed_creator_intervention',
      userId: CREATOR_ID,
      type: 'platform_intervention',
      title: '平台介入 · 正在处理',
      body: 'CUS-DEMO-004：运营已介入核对交付范围。',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_PAY}`,
      payload: { orderId: ORDER_PAY, status: 'processing' },
      hoursAgo: 7
    },
    {
      id: 'ntf_seed_creator_accept_day1',
      userId: CREATOR_ID,
      type: 'acceptance_reminder_day1',
      title: '客户验收提醒已发送（day1）',
      body: 'CUS-DEMO-007',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT, reminder: 'day1' },
      hoursAgo: 9
    },
    {
      id: 'ntf_seed_creator_accept_day5',
      userId: CREATOR_ID,
      type: 'acceptance_reminder_day5',
      title: '客户验收提醒已发送（day5）',
      body: 'CUS-DEMO-007',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT, reminder: 'day5' },
      hoursAgo: 14
    },
    {
      id: 'ntf_seed_creator_accept_day7',
      userId: CREATOR_ID,
      type: 'acceptance_reminder_day7',
      title: '客户验收提醒已发送（day7）',
      body: 'CUS-DEMO-007',
      link: `/creator-center?tab=custom-services&orderId=${ORDER_ACCEPT}`,
      payload: { orderId: ORDER_ACCEPT, reminder: 'day7' },
      hoursAgo: 16
    }
  ];
}

export async function ensureSampleInboxNotifications() {
  await ensureDemoConsultLead();
  const rows = [...buyerNotes(), ...creatorNotes()];
  const ids = rows.map((row) => row.id);
  const existing = await prisma.userNotification.findMany({
    where: { id: { in: ids } },
    select: { id: true }
  });
  const existingIds = new Set(existing.map((row) => row.id));
  const missing = rows.filter((row) => !existingIds.has(row.id));
  if (!missing.length) return { inserted: 0, total: rows.length };
  await prisma.userNotification.createMany({
    data: missing.map((row) => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      payload: toJson(row.payload),
      read: false,
      createdAt: hoursAgo(row.hoursAgo)
    }))
  });
  return { inserted: missing.length, total: rows.length };
}
