import { prisma } from './prisma';

export function formatExpertNo(seq: number): string {
  return `AI-EXP-${String(seq).padStart(6, '0')}`;
}

export function parseExpertNoSeq(expertNo?: string | null): number | null {
  if (!expertNo) return null;
  const m = /^AI-EXP-(\d+)$/i.exec(expertNo.trim());
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

/** 为缺失编号的专家补齐 AI-EXP-XXXXXX */
export async function ensureExpertNos() {
  try {
    const experts = await prisma.expert.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, expertNo: true }
    });

    let next = 1;
    for (const expert of experts) {
      const seq = parseExpertNoSeq(expert.expertNo);
      if (seq != null) next = Math.max(next, seq + 1);
    }

    for (const expert of experts) {
      if (parseExpertNoSeq(expert.expertNo) != null) continue;
      await prisma.expert.update({
        where: { id: expert.id },
        data: { expertNo: formatExpertNo(next) }
      });
      next += 1;
    }
  } catch (error) {
    // 避免 schema/client 未同步时拖垮整个 API 启动
    console.warn('[ensureExpertNos] skipped:', error instanceof Error ? error.message : error);
  }
}

export async function allocateNextExpertNo(): Promise<string> {
  const experts = await prisma.expert.findMany({
    select: { expertNo: true }
  });
  let next = 1;
  for (const expert of experts) {
    const seq = parseExpertNoSeq(expert.expertNo);
    if (seq != null) next = Math.max(next, seq + 1);
  }
  return formatExpertNo(next);
}
