import { prisma } from '../lib/prisma';

/** 为评论举报审核页补齐待处理演示数据 */
export async function ensureSampleCommentReports() {
  const pending = await prisma.agentCommentReport.count({ where: { status: 'pending' } });
  if (pending > 0) return;

  const comments = await prisma.agentComment.findMany({
    where: { parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 3
  });
  if (comments.length === 0) return;

  const samples = [
    { reason: 'spam', detail: '疑似引流广告，内容与智能体无关' },
    { reason: 'abuse', detail: '含有不当人身攻击用语' },
    { reason: 'false_info', detail: '夸大产品效果，与实际情况不符' }
  ];

  await prisma.agentCommentReport.createMany({
    data: comments.slice(0, samples.length).map((comment, index) => ({
      id: `crpt_seed_${index + 1}`,
      commentId: comment.id,
      agentId: comment.agentId,
      reporterUserId: 'user-demo',
      reporterName: '演示用户',
      reason: samples[index].reason,
      detail: samples[index].detail,
      status: 'pending'
    }))
  });
}
