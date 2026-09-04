import dotenv from 'dotenv';
import { ensureSampleCustomOrders } from './seedCustomOrders';
import { ensureFinanceSynced } from './seedFinance';
import { ensureSampleInReviewAgents, ensureSampleCreatorDeletedAgents } from './seedInReviewAgents';
import { ensureSampleAdapterPackages } from './seedAdapterPackages';
import { ensureExpertDomainTagsAligned } from './seedExpertTagUsage';
import { ensureSampleCommentReports } from './seedCommentReports';
import { ensureExpertTags } from '../services/expertTags';
import { ensureExpertTitles } from '../services/expertTitles';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';
import { EXPERT_VERIFY_META } from '../lib/mappers';
import { formatExpertNo, ensureExpertNos } from '../lib/expertNo';
import { defaultHomeBanners, defaultHomeCategories } from '../../shared/homeDefaults';
import { INSPIRATION_MOCK_SHOWCASES } from '../../shared/inspirationMock';
import {
  mockHellomeHomeAgents,
  mockExperts,
  mockAgentSolutions,
  mockServicePackages,
  mockCaseStudies,
  mockClientReviews
} from '../../src/data/mockData';

dotenv.config();

export async function seedDatabase(force = false) {
  const existing = await prisma.agent.count();
  if (existing > 0 && !force) {
    await ensureDemoUserAndCertifications();
    await ensureSampleExpertApplications();
    await ensureSampleCustomOrders();
    await ensureSampleExpertPendingProfile();
    await ensureExpertNos();
    await ensureAgentComments();
    await ensureExpertCasesSynced();
    await ensureFinanceSynced();
    await ensureExpertTags();
    await ensureExpertTitles();
    await ensureSampleInReviewAgents();
    await ensureSampleCreatorDeletedAgents();
    await ensureExpertDomainTagsAligned();
    await ensureSampleAdapterPackages();
    await ensureAgentShowcases();
    await ensureShowcaseComments();
    await ensureSampleCommentReports();
    return { seeded: false, agents: existing };
  }

  if (force) {
    await prisma.walletLedger.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.agentPurchase.deleteMany();
    await prisma.paymentRecord.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.platformFeeRatePeriod.deleteMany();
    await prisma.financeSettings.deleteMany();
    await prisma.financeLedgerEntry.deleteMany();
    await prisma.financeJournal.deleteMany();
    await prisma.financeAccount.deleteMany();
    await prisma.expertTag.deleteMany();
    await prisma.expertTitle.deleteMany();
    await prisma.userNotification.deleteMany();
    await prisma.customOrderEvent.deleteMany();
    await prisma.deliveryVersion.deleteMany();
    await prisma.privateAgentInstance.deleteMany();
    await prisma.customOrder.deleteMany();
    await prisma.consultationMessage.deleteMany();
    await prisma.consultationLead.deleteMany();
    await prisma.expertCertificationEvent.deleteMany();
    await prisma.expertApplication.deleteMany();
    await prisma.expertCertification.deleteMany();
    await prisma.realNameVerification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.expertCase.deleteMany();
    await prisma.expertReview.deleteMany();
    await prisma.expertService.deleteMany();
    await prisma.expert.deleteMany();
    await prisma.agentComment.deleteMany();
    await prisma.agentCommentReport.deleteMany();
    await prisma.agentShowcase.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.homeBanner.deleteMany();
    await prisma.category.deleteMany();
    await prisma.siteSetting.deleteMany();
    await prisma.user.deleteMany();
  }

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@hellome.art';
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'hellome-admin';

  await prisma.user.createMany({
    data: [
      {
        id: 'user-admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: '超级管理员',
        role: 'super_admin'
      },
      {
        id: 'user-ops',
        email: 'ops@hellome.art',
        passwordHash: await bcrypt.hash('hellome-ops', 10),
        name: '运营人员',
        role: 'operator'
      },
      {
        id: 'user-demo',
        email: 'user@hellome.art',
        passwordHash: await bcrypt.hash('hellome-user', 10),
        name: '演示用户',
        role: 'user'
      }
    ]
  });

  await prisma.siteSetting.createMany({
    data: [
      { key: 'home.heroBrand', value: 'Hellome' },
      { key: 'home.creatorCountLabel', value: '已入驻 100+ 认证创作者与工作室' },
      { key: 'home.sectionTitle', value: '热门智能体' },
      { key: 'platform.commissionRate', value: '0.15' }
    ]
  });

  await prisma.homeBanner.createMany({
    data: defaultHomeBanners.map((b) => ({
      id: b.id,
      slot: b.slot,
      eyebrow: b.eyebrow,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      ctaTarget: b.ctaTarget,
      sortOrder: b.sortOrder,
      visible: b.visible
    }))
  });

  await prisma.category.createMany({
    data: defaultHomeCategories
      .filter((name) => name !== '全部')
      .map((name, index) => ({
        id: `cat-${index + 1}`,
        name,
        sortOrder: index + 1,
        visible: true
      }))
  });

  await prisma.agent.createMany({
    data: mockHellomeHomeAgents.map((agent, index) => ({
      id: agent.id,
      kind: 'catalog',
      title: agent.title,
      desc: agent.desc,
      category: agent.category,
      coverImage: agent.coverImage,
      gradient: agent.gradient,
      tagColor: agent.tagColor,
      badge: agent.badge,
      canFDECustom: agent.canFDECustom ?? true,
      authorId: agent.authorId,
      authorName: agent.authorName,
      price: agent.price,
      pricingPlans: toJson(agent.pricingPlans ?? {}),
      likesCount: String(agent.likesCount),
      favoritesCount: String(agent.favoritesCount),
      commentsCount: String(agent.commentsCount),
      sharesCount: String(
        Math.max(1, Math.round(Number(String(agent.likesCount).replace(/k/i, '000')) * 0.12) || 0)
      ),
      usageCount: agent.usageCount,
      rating: agent.rating,
      status: 'published',
      showOnHome: true,
      featured: index < 3,
      sortOrder: index + 1,
      solutionPayload: ''
    }))
  });

  const catalogIds = new Set(mockHellomeHomeAgents.map((agent) => agent.id));
  const overlappingSolutions = mockAgentSolutions.filter((agent) => catalogIds.has(agent.id));
  const uniqueSolutions = mockAgentSolutions.filter((agent) => !catalogIds.has(agent.id));

  for (const agent of overlappingSolutions) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { solutionPayload: toJson(agent) }
    });
  }

  if (uniqueSolutions.length > 0) {
    await prisma.agent.createMany({
      data: uniqueSolutions.map((agent, index) => ({
        id: agent.id,
        kind: 'solution',
        title: agent.title,
        desc: agent.subtitle || agent.description,
        category: agent.category,
        coverImage: agent.coverImage,
        gradient: '',
        tagColor: '',
        badge: null,
        canFDECustom: true,
        authorId: agent.authorId,
        authorName: agent.authorName,
        price: agent.priceFrom,
        pricingPlans: toJson(agent.pricingPlans ?? {}),
        likesCount: String(agent.likesCount),
        favoritesCount: String(agent.favoritesCount ?? 0),
        commentsCount: '0',
        sharesCount: '0',
        usageCount: String(agent.usesCount),
        rating: agent.rating,
        status: 'published',
        showOnHome: false,
        featured: false,
        sortOrder: 100 + index,
        solutionPayload: toJson(agent)
      }))
    });
  }

  for (const [index, expert] of mockExperts.entries()) {
    const userId = `user-${expert.id}`;
    await prisma.user.create({
      data: {
        id: userId,
        email: `${expert.id}@experts.hellome.art`,
        passwordHash: await bcrypt.hash('hellome-expert', 10),
        name: expert.name,
        role: 'expert',
        phone: `138${String(10000000 + index + 1).slice(-8)}`,
        avatar: expert.avatar
      }
    });

    await prisma.expert.create({
      data: {
        id: expert.id,
        userId,
        expertNo: formatExpertNo(index + 1),
        name: expert.name,
        avatar: expert.avatar,
        title: expert.title,
        verifyType: EXPERT_VERIFY_META.verifyType,
        verifyLabel: EXPERT_VERIFY_META.verifyLabel,
        expertLevel: 1,
        roleTag: expert.roleTag,
        domainTags: toJson(expert.domainTags),
        rating: expert.rating,
        ordersCount: expert.ordersCount,
        followersCount: Math.max(12, (expert.ordersCount || 0) * 37 + (index + 1) * 19),
        praiseRate: expert.praiseRate,
        responseTime: expert.responseTime,
        bio: expert.bio,
        location: expert.location,
        serviceModes: toJson(expert.serviceModes),
        guarantees: toJson(expert.guarantees),
        skills: toJson(expert.skills),
        stats: toJson(expert.stats),
        experienceYears: expert.experienceYears,
        featuredQuote: expert.featuredQuote,
        socialLinks: toJson(expert.socialLinks ?? {}),
        listed: true,
        featured: index < 2,
        paused: false,
        sortOrder: index + 1,
        status: 'active'
      }
    });

    const rnId = `rn_${expert.id}`;
    await prisma.realNameVerification.create({
      data: {
        id: rnId,
        userId,
        status: 'verified',
        provider: 'mock',
        providerRef: `seed_${expert.id}`,
        realName: expert.name,
        realNameMasked: `${expert.name[0]}*`,
        idCardMasked: '440301********0000',
        idCardFrontUrl: '/demo/id-card-front.svg',
        idCardBackUrl: '/demo/id-card-back.svg',
        verifiedAt: new Date()
      }
    });

    await prisma.expertCertification.create({
      data: {
        id: `cert_${expert.id}`,
        userId,
        expertId: expert.id,
        status: 'active',
        sourceApplicationId: `seed_app_${expert.id}`,
        certifiedAt: new Date()
      }
    });
  }

  await prisma.expertCase.createMany({
    data: mockCaseStudies.map((item) => ({
      id: item.id,
      expertId: item.expertId,
      payload: toJson(item)
    }))
  });

  await prisma.expertReview.createMany({
    data: mockClientReviews.map((item) => ({
      id: item.id,
      expertId: item.expertId,
      payload: toJson(item)
    }))
  });

  await prisma.expertService.createMany({
    data: mockServicePackages.map((item) => ({
      id: item.id,
      expertId: item.expertId,
      payload: toJson(item)
    }))
  });

  await ensureDemoUserRealName();
  await ensureSampleExpertApplications();
  await ensureSampleCustomOrders();
  await ensureSampleExpertPendingProfile();
  await ensureExpertNos();
  await ensureAgentComments();
  await ensureFinanceSynced();
  await ensureExpertTags();
  await ensureExpertTitles();
  await ensureSampleInReviewAgents();
  await ensureSampleCreatorDeletedAgents();
  await ensureExpertDomainTagsAligned();
  await ensureSampleAdapterPackages();
  await ensureAgentShowcases();
  await ensureShowcaseComments();
  await ensureSampleCommentReports();

  const count = await prisma.agent.count();
  return { seeded: true, agents: count };
}

async function ensureDemoUserRealName() {
  const demo = await prisma.user.findUnique({ where: { id: 'user-demo' } });
  if (!demo) return;
  const existing = await prisma.realNameVerification.findFirst({
    where: { userId: 'user-demo', status: 'verified' }
  });
  if (existing) {
    if (!existing.realName || !existing.idCardMasked.startsWith('320823') || !existing.idCardFrontUrl) {
      await prisma.realNameVerification.update({
        where: { id: existing.id },
        data: {
          realName: existing.realName || '周启航',
          realNameMasked: existing.realNameMasked || '周*',
          idCardMasked: '320823********1234',
          idCardFrontUrl: existing.idCardFrontUrl || '/demo/id-card-front.svg',
          idCardBackUrl: existing.idCardBackUrl || '/demo/id-card-back.svg'
        }
      });
    }
    return;
  }
  await prisma.realNameVerification.create({
    data: {
      id: 'rn_user_demo',
      userId: 'user-demo',
      status: 'verified',
      provider: 'mock',
      providerRef: 'seed_demo',
      realName: '周启航',
      realNameMasked: '周*',
      idCardMasked: '320823********1234',
      idCardFrontUrl: '/demo/id-card-front.svg',
      idCardBackUrl: '/demo/id-card-back.svg',
      verifiedAt: new Date()
    }
  });
}

/** 旧库增量补齐：演示用户 + 专家认证记录 */
async function ensureDemoUserAndCertifications() {
  const demo = await prisma.user.findUnique({ where: { id: 'user-demo' } });
  if (!demo) {
    await prisma.user.create({
      data: {
        id: 'user-demo',
        email: 'user@hellome.art',
        passwordHash: await bcrypt.hash('hellome-user', 10),
        name: '演示用户',
        role: 'user'
      }
    });
  }
  await ensureDemoUserRealName();

  for (const expert of mockExperts) {
    const userId = `user-${expert.id}`;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await prisma.user.create({
        data: {
          id: userId,
          email: `${expert.id}@experts.hellome.art`,
          passwordHash: await bcrypt.hash('hellome-expert', 10),
          name: expert.name,
          role: 'expert',
          avatar: expert.avatar
        }
      });
    }

    // In some partial-seed states, Expert row may be missing but ExpertCertification creation
    // will still run. If Expert doesn't exist, create it first to satisfy foreign keys.
    const row = await prisma.expert.findUnique({ where: { id: expert.id } });
    if (!row) {
      await prisma.expert.create({
        data: {
          id: expert.id,
          userId,
          expertNo: formatExpertNo(mockExperts.findIndex((e) => e.id === expert.id) + 1 || 1),
          name: expert.name,
          avatar: expert.avatar,
          title: expert.title,
          verifyType: EXPERT_VERIFY_META.verifyType,
          verifyLabel: EXPERT_VERIFY_META.verifyLabel,
          expertLevel: 1,
          roleTag: expert.roleTag,
          domainTags: toJson(expert.domainTags),
          rating: expert.rating,
          ordersCount: expert.ordersCount,
          followersCount: Math.max(
            12,
            (expert.ordersCount || 0) * 37 +
              (mockExperts.findIndex((e) => e.id === expert.id) + 1) * 19
          ),
          praiseRate: expert.praiseRate,
          responseTime: expert.responseTime,
          bio: expert.bio,
          location: expert.location,
          serviceModes: toJson(expert.serviceModes),
          guarantees: toJson(expert.guarantees),
          skills: toJson(expert.skills),
          stats: toJson(expert.stats),
          experienceYears: expert.experienceYears,
          featuredQuote: expert.featuredQuote,
          socialLinks: toJson(expert.socialLinks ?? {}),
          listed: true,
          featured: false,
          paused: false,
          sortOrder: 0,
          status: 'active'
        }
      });
    } else if (!row.userId) {
      await prisma.expert.update({ where: { id: expert.id }, data: { userId } });
    }

    const cert = await prisma.expertCertification.findUnique({ where: { expertId: expert.id } });
    if (!cert) {
      await prisma.expertCertification.create({
        data: {
          id: `cert_${expert.id}`,
          userId,
          expertId: expert.id,
          status: 'active',
          sourceApplicationId: `seed_app_${expert.id}`,
          certifiedAt: new Date()
        }
      });
    } else if ((cert as { level?: number }).level !== undefined) {
      // 旧库若仍有 level 列，忽略即可；新 schema 已移除
    }

    await prisma.expert.update({
      where: { id: expert.id },
      data: {
        verifyType: EXPERT_VERIFY_META.verifyType,
        verifyLabel: EXPERT_VERIFY_META.verifyLabel,
        expertLevel: 1,
        ...(row.followersCount === 0
          ? {
              followersCount: Math.max(
                12,
                (expert.ordersCount || 0) * 37 +
                  (mockExperts.findIndex((e) => e.id === expert.id) + 1) * 19
              )
            }
          : {})
      }
    });

    const rn = await prisma.realNameVerification.findFirst({ where: { userId, status: 'verified' } });
    if (!rn) {
      await prisma.realNameVerification.create({
        data: {
          id: `rn_${expert.id}`,
          userId,
          status: 'verified',
          provider: 'mock',
          providerRef: `seed_${expert.id}`,
          realName: expert.name,
          realNameMasked: `${expert.name[0]}*`,
          idCardMasked: '440301********0000',
          idCardFrontUrl: '/demo/id-card-front.svg',
          idCardBackUrl: '/demo/id-card-back.svg',
          verifiedAt: new Date()
        }
      });
    } else if (!rn.realName || !rn.idCardFrontUrl || !rn.idCardBackUrl) {
      await prisma.realNameVerification.update({
        where: { id: rn.id },
        data: {
          realName: rn.realName || expert.name,
          realNameMasked: rn.realNameMasked || `${expert.name[0]}*`,
          idCardMasked: rn.idCardMasked || '440301********0000',
          idCardFrontUrl: rn.idCardFrontUrl || '/demo/id-card-front.svg',
          idCardBackUrl: rn.idCardBackUrl || '/demo/id-card-back.svg'
        }
      });
    }
  }
}

async function ensureSampleExpertApplications() {
  const existing = await prisma.expertApplication.count();
  if (existing > 0) return;

  const demoRn = await prisma.realNameVerification.findFirst({
    where: { userId: 'user-demo', status: 'verified' }
  });

  await prisma.expertApplication.create({
    data: {
      id: 'expapp_sample_onboarding',
      userId: 'user-demo',
      type: 'onboarding',
      status: 'pending',
      submittedProfileSnapshot: toJson({
        applicantName: '周启航',
        expertTitle: '本地生活 AI 运营专家',
        bio: '做过门店私域与团购客服自动化，希望入驻平台发布可运行作品。',
        domainTags: ['本地生活', '电商零售'],
        location: '广州',
        serviceModes: ['远程交付'],
        agentTitle: '门店团购售后助手',
        contactPhone: '13900001111',
        contactEmail: 'zhou@example.com',
        source: 'seed'
      }),
      realNameVerificationId: demoRn?.id || null,
      agreementVersion: 'v1',
      agreementAcceptedAt: new Date()
    }
  });
}

/** 给一名已入驻专家写入待审核主页资料，便于后台「专家详情 · 待审核」演示 */
async function ensureSampleExpertPendingProfile() {
  const expert = await prisma.expert.findUnique({ where: { id: 'fde-zhangheng' } });
  if (!expert) return;
  if (expert.pendingProfileSnapshot?.trim()) return;
  await prisma.expert.update({
    where: { id: expert.id },
    data: {
      pendingProfileSnapshot: toJson({
        name: '张恒',
        bio: '更新后的简介：聚焦金融合规与财报智能体，强化招股书结构化与监管文书自动化。',
        domainTags: ['财报结构化', '智能风控', '合规筛查', '招股书解析']
      })
    }
  });
}

/** 同步 mock 落地案例到 ExpertCase（含多图） */
async function ensureExpertCasesSynced() {
  for (const item of mockCaseStudies) {
    const existing = await prisma.expertCase.findUnique({ where: { id: item.id } });
    if (!existing) {
      await prisma.expertCase.create({
        data: {
          id: item.id,
          expertId: item.expertId,
          payload: toJson(item)
        }
      });
      continue;
    }
    await prisma.expertCase.update({
      where: { id: item.id },
      data: { payload: toJson(item) }
    });
  }
}

export async function ensureExpertApplicationSeed() {
  try {
    await ensureDemoUserAndCertifications();
    await ensureSampleExpertApplications();
    await ensureSampleCustomOrders();
    await ensureSampleExpertPendingProfile();
    await ensureAgentComments();
    await ensureExpertCasesSynced();
    await ensureFinanceSynced();
    await ensureSampleInReviewAgents();
    await ensureSampleCreatorDeletedAgents();
    await ensureExpertDomainTagsAligned();
    await ensureSampleAdapterPackages();
    await ensureAgentShowcases();
    await ensureShowcaseComments();
    await ensureSampleCommentReports();
  } catch (error) {
    console.warn('ensureExpertApplicationSeed skipped:', error);
  }
}

/** 为通用智能体补齐评论与作者回复（计数含回复） */
export async function ensureAgentComments() {
  const catalogAgents = await prisma.agent.findMany({
    where: { kind: 'catalog' },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, authorName: true, authorId: true }
  });
  if (catalogAgents.length === 0) return;

  const existingByAgent = await prisma.agentComment.groupBy({
    by: ['agentId'],
    where: { source: 'agent' },
    _count: { _all: true }
  });
  const hasComments = new Set(existingByAgent.map((r) => r.agentId));
  const missing = catalogAgents.filter((a) => !hasComments.has(a.id));

  if (missing.length === 0) {
    await ensureExtraAgentComments();
    return;
  }

  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'
  ];

  const userNames = ['视觉设计师-小澈', '品牌增长-程璐', '政企公文助手-王科', '独立创作者-Leo', '项目助理-陈欣'];
  const userNames2 = ['晴天工作室', 'SEO老兵-阿威', '跨境运营-小北', '内容主编-阿月', '产品经理-周舟'];
  const contents = [
    '这个智能体上手很快，业务场景贴合度很高，已经推荐给同事了。',
    '效果比预期好，尤其是结构化输出部分，几乎不用二次改。',
    '临时救急非常管用，格式和语气都很到位。',
    '希望后续能支持更多行业模板。',
    '整体体验流畅，收藏了！'
  ];
  const contents2 = [
    '配合作者二次定制后完全打通了我们的资产库，非常给力。',
    '抓取语义比传统方案更有参考价值。',
    '已经在团队里推广使用了。',
    '回复很快，问题解决及时。',
    '会继续关注版本更新。'
  ];

  const samples: Array<{
    id: string;
    agentId: string;
    parentId?: string;
    userName: string;
    userAvatar: string;
    isAuthor: boolean;
    content: string;
    createdAt: Date;
  }> = [];

  missing.forEach((agent, i) => {
    const c1 = `cmt_${agent.id}_1`;
    samples.push({
      id: c1,
      agentId: agent.id,
      userName: userNames[i % userNames.length],
      userAvatar: avatars[i % avatars.length],
      isAuthor: false,
      content: contents[i % contents.length],
      createdAt: new Date(Date.now() - (i + 1) * 3600_000)
    });
    samples.push({
      id: `cmt_${agent.id}_2`,
      agentId: agent.id,
      userName: userNames2[i % userNames2.length],
      userAvatar: avatars[(i + 1) % avatars.length],
      isAuthor: false,
      content: contents2[i % contents2.length],
      createdAt: new Date(Date.now() - (i + 2) * 7200_000)
    });
    samples.push({
      id: `cmt_${agent.id}_reply`,
      agentId: agent.id,
      parentId: c1,
      userName: agent.authorName || '作者',
      userAvatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      isAuthor: true,
      content: '感谢反馈！有定制或对接需求可以直接咨询我，会持续优化。',
      createdAt: new Date(Date.now() - i * 1800_000)
    });
  });

  await prisma.agentComment.createMany({ data: samples });
  await ensureExtraAgentComments();
}

async function ensureExtraAgentComments() {
  const extra = [
    {
      id: 'cmt_hz-canvas_3',
      agentId: 'hz-canvas',
      userName: '品牌增长-程璐',
      userAvatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
      isAuthor: false,
      content: '配合作者二次定制后打通了我们的资产库，交付速度比预期快。',
      createdAt: new Date(Date.now() - 20 * 3600_000)
    },
    {
      id: 'cmt_hz-canvas_4',
      agentId: 'hz-canvas',
      userName: '项目助理-陈欣',
      userAvatar:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      isAuthor: false,
      content: '临时救急非常管用，格式和语气都到位，已经收藏了。',
      createdAt: new Date(Date.now() - 30 * 3600_000)
    },
    {
      id: 'cmt_hz-canvas_5',
      agentId: 'hz-canvas',
      userName: 'SEO老兵-阿威',
      userAvatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      isAuthor: false,
      content: '希望后续能再多一些行业模板，现在已经能覆盖日常大部分需求。',
      createdAt: new Date(Date.now() - 48 * 3600_000)
    },
    {
      id: 'cmt_hz-canvas_6',
      agentId: 'hz-canvas',
      userName: '内容主编-阿月',
      userAvatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      isAuthor: false,
      content: '短视频分镜和主视觉延展都很稳，团队里已经在推广使用。',
      createdAt: new Date(Date.now() - 56 * 3600_000)
    }
  ];
  const existing = await prisma.agentComment.findMany({
    where: { id: { in: extra.map((row) => row.id) } },
    select: { id: true }
  });
  const existingIdSet = new Set(existing.map((row) => row.id));
  const agents = await prisma.agent.findMany({
    where: { id: { in: [...new Set(extra.map((row) => row.agentId))] } },
    select: { id: true }
  });
  const existingAgentIds = new Set(agents.map((row) => row.id));
  const rows = extra.filter(
    (row) => existingAgentIds.has(row.agentId) && !existingIdSet.has(row.id)
  );
  if (rows.length === 0) return;
  await prisma.agentComment.createMany({ data: rows });
  await syncAgentCommentCounts();
}

async function syncAgentCommentCounts() {
  const groups = await prisma.agentComment.groupBy({
    by: ['agentId'],
    where: { source: 'agent' },
    _count: { _all: true }
  });
  for (const row of groups) {
    await prisma.agent.update({
      where: { id: row.agentId },
      data: { commentsCount: String(row._count._all) }
    });
  }
}

export async function ensureAgentShowcases() {
  const catalogAgents = await prisma.agent.findMany({
    where: { kind: 'catalog' },
    orderBy: { sortOrder: 'asc' },
    select: { id: true }
  });
  if (catalogAgents.length === 0) return;

  const existing = await prisma.agentShowcase.groupBy({
    by: ['agentId'],
    _count: { _all: true }
  });
  const hasShowcases = new Set(existing.map((row) => row.agentId));
  const missing = catalogAgents.filter((agent) => !hasShowcases.has(agent.id));

  const samples = [
    {
      title: '品牌主视觉分镜稿',
      description:
        '用无限画布把品牌主视觉拆成可标注的分镜，圈选素材后直接出图。这次给新茶饮做了三套主 KV，色板和构图都更稳。',
      imageUrl:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      userName: '视觉设计师-小澈',
      featured: false,
      likesCount: 128
    },
    {
      title: '产品短视频分镜成片',
      description:
        '先在画布上标出镜头节奏，再导出成片。这条 15 秒产品视频从分镜到成片大约半天，Prompt 结构比手写稳定很多。',
      imageUrl:
        'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&auto=format&fit=crop&q=80',
      userName: '独立创作者-Leo',
      featured: false,
      likesCount: 86
    },
    {
      title: '活动主KV延展',
      description: '活动主视觉延展到物料和社媒尺寸，保持同一套构图语言，投放素材不用重新找感觉。',
      imageUrl:
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&auto=format&fit=crop&q=80',
      userName: '品牌增长-程璐',
      featured: false,
      likesCount: 54
    },
    {
      title: '素材标注后的合成稿',
      description: '把参考图和成品标注在同一画布上对照，合成边缘和光影更容易调。',
      imageUrl:
        'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&auto=format&fit=crop&q=80',
      userName: '项目助理-陈欣',
      featured: false,
      likesCount: 23
    },
    {
      title: '包装系列视觉提案',
      description: '系列包装主画面一次出三款配色，方便给客户对稿。',
      imageUrl:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop&q=80',
      userName: '晴天工作室',
      featured: false,
      likesCount: 41
    },
    {
      title: '社媒封面组图',
      description: '一周社媒封面统一视觉语言，封面和内容页可以一起导出。',
      imageUrl:
        'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&auto=format&fit=crop&q=80',
      userName: '内容主编-阿月',
      featured: false,
      likesCount: 19
    }
  ];
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'
  ];

  if (missing.length > 0) {
    await prisma.agentShowcase.createMany({
      data: missing.flatMap((agent, agentIndex) =>
        samples.map((item, index) => ({
          id: `ash_${agent.id}_${index + 1}`,
          agentId: agent.id,
          userId: `showcase-${agent.id}-${index}`,
          userName: item.userName,
          userAvatar: avatars[(agentIndex + index) % avatars.length],
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          fileName: '',
          status: 'visible',
          featured: false,
          likesCount: item.likesCount,
          createdAt: new Date(Date.now() - (index + 1) * 36e5)
        }))
      )
    });
  }

  const hz = catalogAgents.find((agent) => agent.id === 'hz-canvas');
  if (hz) {
    const extraShowcases = samples.slice(4).map((item, index) => ({
      id: `ash_hz-canvas_${index + 5}`,
      agentId: hz.id,
      userId: `showcase-hz-canvas-${index + 4}`,
      userName: item.userName,
      userAvatar: avatars[(index + 2) % avatars.length],
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      fileName: '',
      status: 'visible',
      featured: false,
      likesCount: item.likesCount,
      createdAt: new Date(Date.now() - (index + 5) * 36e5)
    }));
    const existingExtra = await prisma.agentShowcase.findMany({
      where: { id: { in: extraShowcases.map((row) => row.id) } },
      select: { id: true }
    });
    const extraIdSet = new Set(existingExtra.map((row) => row.id));
    const extraRows = extraShowcases.filter((row) => !extraIdSet.has(row.id));
    if (extraRows.length > 0) {
      await prisma.agentShowcase.createMany({ data: extraRows });
    }
  }

  const sampleIds = catalogAgents.flatMap((agent) =>
    samples.map((_, index) => `ash_${agent.id}_${index + 1}`)
  );
  sampleIds.push('ash_hz-canvas_5', 'ash_hz-canvas_6');
  await prisma.agentShowcase.updateMany({
    where: {
      OR: [{ id: { in: sampleIds } }, { id: { startsWith: 'ash_hz_' } }]
    },
    data: { featured: false }
  });

  const catalogIdSet = new Set(catalogAgents.map((agent) => agent.id));
  for (const item of INSPIRATION_MOCK_SHOWCASES) {
    if (!catalogIdSet.has(item.agentId)) continue;
    await prisma.agentShowcase.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        agentId: item.agentId,
        userId: item.userId,
        userName: item.userName,
        userAvatar: item.userAvatar,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        fileName: item.fileName,
        status: 'visible',
        featured: item.featured,
        inspireCategory: item.inspireCategory,
        likesCount: item.likesCount,
        createdAt: new Date(Date.now() - item.hoursAgo * 36e5)
      },
      update: {
        agentId: item.agentId,
        userId: item.userId,
        userName: item.userName,
        userAvatar: item.userAvatar,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        fileName: item.fileName,
        status: 'visible',
        featured: item.featured,
        inspireCategory: item.inspireCategory,
        likesCount: item.likesCount
      }
    });
  }
}

export async function ensureShowcaseComments() {
  const showcases = await prisma.agentShowcase.findMany({
    where: { id: { in: INSPIRATION_MOCK_SHOWCASES.map((item) => item.id) }, status: 'visible' },
    select: {
      id: true,
      agentId: true,
      title: true,
      userId: true,
      userName: true,
      userAvatar: true
    }
  });
  if (showcases.length === 0) return;

  const existing = await prisma.agentComment.findMany({
    where: { source: 'showcase', showcaseId: { in: showcases.map((row) => row.id) } },
    select: { id: true }
  });
  const existingIds = new Set(existing.map((row) => row.id));

  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'
  ];
  const samples = [
    {
      userName: '品牌增长-程璐',
      content: '这套 KV 的色板很稳，直接能拿去给客户对稿。',
      hoursAgo: 3
    },
    {
      userName: '独立创作者-Leo',
      content: '分镜结构清楚，后面出短视频也省很多沟通。',
      hoursAgo: 9
    },
    {
      userName: '内容主编-阿月',
      content: '介绍写得很具体，想复用同一套智能体试试。',
      hoursAgo: 20
    }
  ];
  const authorReplies = [
    '感谢认可！主视觉分镜可以直接在画布里改色板后再导出。',
    '镜头节奏我标在画布右侧了，按那个切基本一次过。',
    '欢迎直接用同款智能体，有定制也可以找我。'
  ];

  const rows: Array<{
    id: string;
    agentId: string;
    source: string;
    showcaseId: string;
    parentId?: string;
    userId?: string;
    userName: string;
    userAvatar: string;
    isAuthor: boolean;
    content: string;
    createdAt: Date;
  }> = [];

  showcases.forEach((showcase, showcaseIndex) => {
    const sample = samples[showcaseIndex % samples.length];
    const rootId = `cmt_insp_${showcase.id}_1`;
    rows.push({
      id: rootId,
      agentId: showcase.agentId,
      source: 'showcase',
      showcaseId: showcase.id,
      userName: sample.userName,
      userAvatar: avatars[showcaseIndex % avatars.length],
      isAuthor: false,
      content: sample.content,
      createdAt: new Date(Date.now() - sample.hoursAgo * 36e5)
    });
    rows.push({
      id: `cmt_insp_${showcase.id}_reply`,
      agentId: showcase.agentId,
      source: 'showcase',
      showcaseId: showcase.id,
      parentId: rootId,
      userId: showcase.userId,
      userName: showcase.userName,
      userAvatar: showcase.userAvatar,
      isAuthor: true,
      content: authorReplies[showcaseIndex % authorReplies.length],
      createdAt: new Date(Date.now() - Math.max(1, sample.hoursAgo - 2) * 36e5)
    });
    if (showcaseIndex % 2 === 0) {
      const extra = samples[(showcaseIndex + 1) % samples.length];
      rows.push({
        id: `cmt_insp_${showcase.id}_2`,
        agentId: showcase.agentId,
        source: 'showcase',
        showcaseId: showcase.id,
        userName: extra.userName,
        userAvatar: avatars[(showcaseIndex + 2) % avatars.length],
        isAuthor: false,
        content: extra.content,
        createdAt: new Date(Date.now() - (extra.hoursAgo + 6) * 36e5)
      });
    }
  });

  const toCreate = rows.filter((row) => !existingIds.has(row.id));
  if (toCreate.length > 0) {
    await prisma.agentComment.createMany({ data: toCreate });
  }

  for (const showcase of showcases) {
    await prisma.agentComment.updateMany({
      where: { id: `cmt_insp_${showcase.id}_reply` },
      data: {
        userId: showcase.userId,
        userName: showcase.userName,
        userAvatar: showcase.userAvatar,
        isAuthor: true
      }
    });
  }
}

async function main() {
  const result = await seedDatabase(process.argv.includes('--force'));
  console.log(result);
}

const isDirect = process.argv[1]?.includes('seed');
if (isDirect) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
