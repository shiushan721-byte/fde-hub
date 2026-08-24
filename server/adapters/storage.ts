import fs from 'node:fs/promises';
import path from 'node:path';

export interface UploadInput {
  fileName: string;
  buffer: Buffer;
  mimeType?: string;
}

export interface StoredFile {
  fileKey: string;
  url: string;
}

export interface StorageAdapter {
  upload(input: UploadInput): Promise<StoredFile>;
  delete(fileKey: string): Promise<void>;
  getSignedUrl(fileKey: string): Promise<string>;
}

const localDir = path.resolve(process.cwd(), 'server/uploads');

export const localStorageAdapter: StorageAdapter = {
  async upload(input) {
    await fs.mkdir(localDir, { recursive: true });
    const fileKey = `${Date.now()}-${input.fileName.replace(/[^\w.\-]+/g, '_')}`;
    await fs.writeFile(path.join(localDir, fileKey), input.buffer);
    return { fileKey, url: `/uploads/${fileKey}` };
  },
  async delete(fileKey) {
    await fs.unlink(path.join(localDir, fileKey)).catch(() => undefined);
  },
  async getSignedUrl(fileKey) {
    return `/uploads/${fileKey}`;
  }
};
