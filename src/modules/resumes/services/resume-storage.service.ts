import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { RESUME_STORAGE_BACKEND } from '../storage/resume-storage.backend';
import type { ResumeStorageBackend } from '../storage/resume-storage.backend';

@Injectable()
export class ResumeStorageService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(RESUME_STORAGE_BACKEND)
    private readonly backend: ResumeStorageBackend,
  ) {}

  save(userId: string, file: Express.Multer.File) {
    return this.backend.save(userId, file);
  }

  delete(storagePath: string) {
    return this.backend.delete(storagePath);
  }

  openReadStream(storagePath: string): Promise<Readable> {
    return this.backend.openReadStream(storagePath);
  }

  buildFileUrl(resumeId: string): string {
    const baseUrl = this.getPublicApiUrl();
    return `${baseUrl}/api/v1/resumes/${resumeId}/file`;
  }

  private getPublicApiUrl(): string {
    const configured = this.configService.get<string>('API_PUBLIC_URL');
    if (configured) {
      return configured.replace(/\/$/, '');
    }

    const port = this.configService.get<number>('PORT', 3000);
    return `http://localhost:${port}`;
  }
}
