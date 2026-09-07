import fs from 'node:fs';
import path from 'node:path';
import type { Response } from 'express';
import { parseJson } from '../lib/json';
import { prisma } from '../lib/prisma';
import {
  adapterPackageIsFree,
  findAdapterPackage,
  type AgentAdapterPackage
} from '../../shared/adapterPackages';
import { getAdapterEntitlement } from './catalogPurchase';

const uploadsDir = path.resolve(process.cwd(), 'server/uploads');

export function adapterDiskPath(pack: Pick<AgentAdapterPackage, 'fileKey' | 'url'>) {
  const fromKey = pack.fileKey?.replace(/^\/+/, '') || '';
  const fromUrl = pack.url.startsWith('/uploads/') ? pack.url.slice('/uploads/'.length) : '';
  const key = fromKey || fromUrl;
  if (!key || key.includes('..') || path.isAbsolute(key)) return null;
  return path.join(uploadsDir, key);
}

export async function resolveAdapterDownload(input: {
  agentId: string;
  packageId: string;
  userId?: string;
}) {
  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, creatorDeletedAt: null }
  });
  if (!agent) return { error: '智能体不存在', status: 404 as const, pack: null, agent: null };
  const pack = findAdapterPackage(parseJson(agent.adapterPackages, []), input.packageId);
  if (!pack) return { error: '适配包不存在', status: 404 as const, pack: null, agent };

  if (adapterPackageIsFree(pack)) return { error: null, status: 200 as const, pack, agent };

  if (!input.userId) {
    return { error: '请先购买后再下载', status: 401 as const, pack, agent };
  }
  const expertOwner =
    agent.authorId &&
    (await prisma.expert.findFirst({
      where: { id: agent.authorId, userId: input.userId },
      select: { id: true }
    }));
  if (expertOwner) return { error: null, status: 200 as const, pack, agent };

  const owned = await getAdapterEntitlement(input.userId, agent.id, pack.id);
  if (!owned) return { error: '请先购买该适配包', status: 403 as const, pack, agent };
  return { error: null, status: 200 as const, pack, agent };
}

export function sendAdapterFile(res: Response, pack: AgentAdapterPackage) {
  const disk = adapterDiskPath(pack);
  if (disk && fs.existsSync(disk)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(pack.fileName)}`);
    return fs.createReadStream(disk).pipe(res);
  }
  if (pack.url) {
    res.redirect(pack.url);
    return;
  }
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '文件不存在' } });
}
