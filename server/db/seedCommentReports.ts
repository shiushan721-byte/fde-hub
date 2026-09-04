import { prisma } from '../lib/prisma';
import { INSPIRATION_MOCK_SHOWCASES } from '../../shared/inspirationMock';

/** 为评论举报审核页补齐待处理演示数据，并区分智能体 / 成果来源 */
export async function ensureSampleCommentReports() {
  const agentPending = await prisma.agentCommentReport.count({
    where: { status: 'pending', source: 'agent' }
  });
  if (agentPending === 0) {
    const comments = await prisma.agentComment.findMany({
      where: { parentId: null, source: 'agent' },
      orderBy: { createdAt: 'asc' },
      take: 3
    });
    if (comments.length > 0) {
      const samples = [
        { reason: 'spam', detail: '疑似引流广告，内容与智能体无关' },
        { reason: 'abuse', detail: '含有不当人身攻击用语' },
        { reason: 'false_info', detail: '夸大产品效果，与实际情况不符' }
      ];
      const existing = await prisma.agentCommentReport.findMany({
        where: { id: { in: samples.map((_, index) => `crpt_seed_${index + 1}`) } },
        select: { id: true }
      });
      const existingIds = new Set(existing.map((row) => row.id));
      const rows = comments.slice(0, samples.length).map((comment, index) => ({
        id: `crpt_seed_${index + 1}`,
        commentId: comment.id,
        agentId: comment.agentId,
        source: 'agent',
        showcaseId: null as string | null,
        reporterUserId: 'user-demo',
        reporterName: '演示用户',
        reason: samples[index].reason,
        detail: samples[index].detail,
        status: 'pending'
      })).filter((row) => !existingIds.has(row.id));
      if (rows.length > 0) {
        await prisma.agentCommentReport.createMany({ data: rows });
      }
    }
  }

  const showcasePending = await prisma.agentCommentReport.count({
    where: { status: 'pending', source: 'showcase' }
  });
  if (showcasePending > 0) return;

  const showcaseComments = await prisma.agentComment.findMany({
    where: {
      parentId: null,
      source: 'showcase',
      showcaseId: { in: INSPIRATION_MOCK_SHOWCASES.map((item) => item.id) }
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  if (showcaseComments.length === 0) return;

  const showcaseSamples = [
    { reason: 'spam', detail: '成果评论里夹带无关推广链接' },
    { reason: 'false_info', detail: '夸大成果效果，和实际成片不符' },
    { reason: 'abuse', detail: '对上传者进行人身攻击' }
  ];
  const ids = showcaseSamples.map((_, index) => `crpt_insp_seed_${index + 1}`);
  const existing = await prisma.agentCommentReport.findMany({
    where: { id: { in: ids } },
    select: { id: true }
  });
  const existingIds = new Set(existing.map((row) => row.id));
  const rows = showcaseComments.slice(0, showcaseSamples.length).map((comment, index) => ({
    id: `crpt_insp_seed_${index + 1}`,
    commentId: comment.id,
    agentId: comment.agentId,
    source: 'showcase',
    showcaseId: comment.showcaseId,
    reporterUserId: 'user-demo',
    reporterName: '演示用户',
    reason: showcaseSamples[index].reason,
    detail: showcaseSamples[index].detail,
    status: 'pending'
  })).filter((row) => !existingIds.has(row.id));
  if (rows.length > 0) {
    await prisma.agentCommentReport.createMany({ data: rows });
  }
}
