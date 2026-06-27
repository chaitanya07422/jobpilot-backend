import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { ResumeStorageBackend } from './resume-storage.backend';

@Injectable()
export class LocalResumeStorage implements ResumeStorageBackend {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
  }

  async save(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ storagePath: string }> {
    const storedFileName = `${randomUUID()}.pdf`;
    const storagePath = join('resumes', userId, storedFileName);
    const absolutePath = this.resolveAbsolutePath(storagePath);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return { storagePath };
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await unlink(this.resolveAbsolutePath(storagePath));
    } catch {
      // Ignore missing files during cleanup
    }
  }

  openReadStream(storagePath: string): Promise<Readable> {
    const absolutePath = this.resolveAbsolutePath(storagePath);

    if (!existsSync(absolutePath)) {
      return Promise.reject(new Error('Resume file not found'));
    }

    return Promise.resolve(createReadStream(absolutePath));
  }

  private resolveAbsolutePath(storagePath: string): string {
    return join(process.cwd(), this.uploadDir, storagePath);
  }
}
