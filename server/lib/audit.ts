import { prisma } from './prisma';
import { toJson } from './json';

export async function writeAudit(input: {
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  diff?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      diff: toJson(input.diff ?? {})
    }
  });
}
