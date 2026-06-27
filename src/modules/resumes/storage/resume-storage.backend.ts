import { Readable } from 'stream';

export interface ResumeStorageBackend {
  save(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ storagePath: string }>;

  delete(storagePath: string): Promise<void>;

  openReadStream(storagePath: string): Promise<Readable>;
}

export const RESUME_STORAGE_BACKEND = 'RESUME_STORAGE_BACKEND';
