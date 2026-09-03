import { prisma } from '../lib/prisma';
import { toJson } from '../lib/json';
import { localStorageAdapter } from '../adapters/storage';
import type { AgentAdapterPackage } from '../../shared/adapterPackages';

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipBytes(n: number, size: 2 | 4) {
  const b = new Uint8Array(size);
  const view = new DataView(b.buffer);
  if (size === 2) view.setUint16(0, n, true);
  else view.setUint32(0, n, true);
  return b;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function makeZip(files: Array<{ name: string; data: Uint8Array }>) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = concatBytes([
      zipBytes(0x04034b50, 4),
      zipBytes(20, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(crc, 4),
      zipBytes(file.data.length, 4),
      zipBytes(file.data.length, 4),
      zipBytes(name.length, 2),
      zipBytes(0, 2),
      name,
      file.data
    ]);
    const central = concatBytes([
      zipBytes(0x02014b50, 4),
      zipBytes(20, 2),
      zipBytes(20, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(crc, 4),
      zipBytes(file.data.length, 4),
      zipBytes(file.data.length, 4),
      zipBytes(name.length, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 4),
      zipBytes(offset, 4),
      name
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concatBytes(centrals);
  const end = concatBytes([
    zipBytes(0x06054b50, 4),
    zipBytes(0, 2),
    zipBytes(0, 2),
    zipBytes(files.length, 2),
    zipBytes(files.length, 2),
    zipBytes(centralDir.length, 4),
    zipBytes(offset, 4),
    zipBytes(0, 2)
  ]);
  return Buffer.from(concatBytes([...locals, centralDir, end]));
}

const SAMPLE_PLATFORMS = [
  { id: 'adp_hz_workbuddy', platformName: 'WorkBuddy', fileName: 'hz-canvas-workbuddy.zip' },
  { id: 'adp_hz_codex', platformName: 'Codex', fileName: 'hz-canvas-codex.zip' },
  { id: 'adp_hz_enterprise', platformName: '企业内部工具', fileName: 'hz-canvas-enterprise.zip' }
];

export async function ensureSampleAdapterPackages() {
  const agent = await prisma.agent.findUnique({ where: { id: 'hz-canvas' } });
  if (!agent) return;
  if (agent.adapterPackages && agent.adapterPackages.trim() && agent.adapterPackages.trim() !== '[]') {
    return;
  }

  const packages: AgentAdapterPackage[] = [];
  for (const sample of SAMPLE_PLATFORMS) {
    const zip = makeZip([
      {
        name: 'README.txt',
        data: new TextEncoder().encode(
          `Hellome 适配版本：${sample.platformName}\n面向外部工具的分发包示例，站内仍通过 Hermes 运行。\n`
        )
      }
    ]);
    const stored = await localStorageAdapter.upload({
      fileName: sample.fileName,
      buffer: zip,
      mimeType: 'application/zip'
    });
    packages.push({
      id: sample.id,
      platformName: sample.platformName,
      fileName: sample.fileName,
      size: `${Math.max(1, Math.round(zip.length / 1024))} KB`,
      url: stored.url,
      fileKey: stored.fileKey
    });
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { adapterPackages: toJson(packages) }
  });
}
