import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';

export const COMMENT_REPORT_REASONS = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'abuse', label: '辱骂骚扰' },
  { value: 'illegal', label: '违法违规' },
  { value: 'false_info', label: '虚假信息' },
  { value: 'other', label: '其他' }
] as const;

export type CommentReportReason = (typeof COMMENT_REPORT_REASONS)[number]['value'];

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  COMMENT_REPORT_REASONS.map((r) => [r.value, r.label])
);

function newReportId() {
  return `crpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newNotificationId() {
  return `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function reasonLabel(reason: string) {
  return REASON_LABEL[reason] || reason;
}

export async function countPendingCommentReports() {
  return prisma.agentCommentReport.count({ where: { status: 'pending' } });
}

export async function createCommentReport(input: {
  agentId: string;
  commentId: string;
  reason: CommentReportReason;
  detail?: string;
  reporterUserId?: string;
  reporterName?: string;
  source?: 'agent' | 'showcase';
  showcaseId?: string;
}) {
  const comment = await prisma.agentComment.findFirst({
    where:
      input.source === 'showcase' || input.showcaseId
        ? { id: input.commentId, showcaseId: input.showcaseId || undefined, source: 'showcase' }
        : { id: input.commentId, agentId: input.agentId, source: 'agent' }
  });
  if (!comment) throw new Error('评论不存在');

  if (input.reporterUserId) {
    const existing = await prisma.agentCommentReport.findFirst({
      where: {
        commentId: input.commentId,
        reporterUserId: input.reporterUserId,
        status: 'pending'
      }
    });
    if (existing) throw new Error('您已举报过该评论，请等待处理');
  }

  const agent = await prisma.agent.findUnique({
    where: { id: comment.agentId },
    select: { title: true }
  });
  const showcase = comment.showcaseId
    ? await prisma.agentShowcase.findUnique({
        where: { id: comment.showcaseId },
        select: { title: true }
      })
    : null;
  const source = (comment.source === 'showcase' ? 'showcase' : 'agent') as 'agent' | 'showcase';
  const place =
    source === 'showcase'
      ? `成果「${showcase?.title || '未命名成果'}」`
      : `智能体「${agent?.title || '—'}」`;

  return prisma.$transaction(async (tx) => {
    const report = await tx.agentCommentReport.create({
      data: {
        id: newReportId(),
        commentId: input.commentId,
        agentId: comment.agentId,
        source,
        showcaseId: comment.showcaseId,
        reporterUserId: input.reporterUserId || null,
        reporterName: input.reporterName || '用户',
        reason: input.reason,
        detail: input.detail?.trim() || '',
        status: 'pending'
      }
    });

    if (input.reporterUserId) {
      await tx.userNotification.create({
        data: {
          id: newNotificationId(),
          userId: input.reporterUserId,
          type: 'comment_report_submitted',
          title: '举报已受理',
          body: `您举报的评论已提交，平台核实后将通过站内信告知处理结果。来源：${place}`,
          link: '',
          payload: toJson({
            reportId: report.id,
            agentId: comment.agentId,
            commentId: input.commentId,
            source,
            showcaseId: comment.showcaseId,
            reason: input.reason,
            reasonLabel: reasonLabel(input.reason)
          })
        }
      });
    }

    return report;
  });
}

export async function listCommentReports(status?: string, source?: string) {
  const reports = await prisma.agentCommentReport.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(source ? { source } : {})
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 200
  });

  const commentIds = [...new Set(reports.map((r) => r.commentId))];
  const agentIds = [...new Set(reports.map((r) => r.agentId))];
  const showcaseIds = [...new Set(reports.map((r) => r.showcaseId).filter(Boolean))] as string[];

  const [comments, agents, showcases] = await Promise.all([
    commentIds.length
      ? prisma.agentComment.findMany({ where: { id: { in: commentIds } } })
      : Promise.resolve([]),
    agentIds.length
      ? prisma.agent.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, title: true, authorName: true }
        })
      : Promise.resolve([]),
    showcaseIds.length
      ? prisma.agentShowcase.findMany({
          where: { id: { in: showcaseIds } },
          select: { id: true, title: true }
        })
      : Promise.resolve([])
  ]);

  const commentById = new Map(comments.map((c) => [c.id, c]));
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const showcaseById = new Map(showcases.map((s) => [s.id, s]));

  return reports.map((report) => {
    const comment = commentById.get(report.commentId);
    const agent = agentById.get(report.agentId);
    const showcase = report.showcaseId ? showcaseById.get(report.showcaseId) : null;
    const source = report.source === 'showcase' ? 'showcase' : 'agent';
    return {
      ...report,
      source,
      sourceLabel: source === 'showcase' ? '成果评论' : '智能体评论',
      reasonLabel: reasonLabel(report.reason),
      commentContent: comment?.content || '（评论已删除）',
      commentUserName: comment?.userName || '—',
      commentCreatedAt: comment?.createdAt || null,
      agentTitle: agent?.title || '—',
      agentAuthorName: agent?.authorName || '',
      showcaseTitle: showcase?.title || ''
    };
  });
}

export async function dismissCommentReport(reportId: string, reviewerId?: string, note?: string) {
  const report = await prisma.agentCommentReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error('举报不存在');
  if (report.status !== 'pending') throw new Error('该举报已处理');

  const agent = await prisma.agent.findUnique({
    where: { id: report.agentId },
    select: { title: true }
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.agentCommentReport.update({
      where: { id: reportId },
      data: {
        status: 'dismissed',
        reviewerId: reviewerId || null,
        reviewNote: note?.trim() || '',
        reviewedAt: new Date()
      }
    });

    if (report.reporterUserId) {
      await tx.userNotification.create({
        data: {
          id: newNotificationId(),
          userId: report.reporterUserId,
          type: 'comment_report_dismissed',
          title: '举报处理结果',
          body: `您举报的评论经核实暂未发现违规，已作忽略处理。${agent?.title ? `智能体：${agent.title}` : ''}`,
          link: '',
          payload: toJson({ reportId: report.id, agentId: report.agentId, commentId: report.commentId })
        }
      });
    }

    return updated;
  });
}

export async function removeCommentForReport(reportId: string, reviewerId?: string, note?: string) {
  const report = await prisma.agentCommentReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error('举报不存在');
  if (report.status !== 'pending') throw new Error('该举报已处理');

  const comment = await prisma.agentComment.findFirst({
    where: { id: report.commentId, agentId: report.agentId }
  });
  const agent = await prisma.agent.findUnique({
    where: { id: report.agentId },
    select: { title: true }
  });

  return prisma.$transaction(async (tx) => {
    const pendingReporters = await tx.agentCommentReport.findMany({
      where: { commentId: report.commentId, status: 'pending' },
      select: { reporterUserId: true }
    });

    if (comment) {
      await tx.agentComment.deleteMany({
        where: {
          agentId: report.agentId,
          source: comment.source === 'showcase' ? 'showcase' : 'agent',
          ...(comment.showcaseId ? { showcaseId: comment.showcaseId } : {}),
          OR: [{ id: comment.id }, { parentId: comment.id }]
        }
      });
      const remaining = await tx.agentComment.count({
        where: { agentId: report.agentId, source: comment?.source === 'showcase' ? 'showcase' : 'agent' }
      });
      if (comment?.source !== 'showcase') {
        await tx.agent.update({
          where: { id: report.agentId },
          data: { commentsCount: String(remaining) }
        });
      }
    }

    await tx.agentCommentReport.updateMany({
      where: {
        commentId: report.commentId,
        status: 'pending'
      },
      data: {
        status: 'removed',
        reviewerId: reviewerId || null,
        reviewNote: note?.trim() || '评论已删除',
        reviewedAt: new Date()
      }
    });

    const notified = new Set<string>();
    for (const row of pendingReporters) {
      if (!row.reporterUserId || notified.has(row.reporterUserId)) continue;
      notified.add(row.reporterUserId);
      await tx.userNotification.create({
        data: {
          id: newNotificationId(),
          userId: row.reporterUserId,
          type: 'comment_report_removed',
          title: '举报处理结果',
          body: `您举报的评论已核实并删除，感谢反馈。${agent?.title ? `智能体：${agent.title}` : ''}`,
          link: '',
          payload: toJson({ reportId: report.id, agentId: report.agentId, commentId: report.commentId })
        }
      });
    }

    return tx.agentCommentReport.findUnique({ where: { id: reportId } });
  });
}
