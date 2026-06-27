import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Readable } from 'stream';
import { UserDocument } from '../../auth/schemas';
import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_SIZE_BYTES,
} from '../constants/resume.constants';
import {
  ResumeResponse,
  toResumeResponse,
} from '../interfaces/resume-response.interface';
import { Resume, ResumeDocument } from '../schemas';
import { ResumeStorageService } from './resume-storage.service';

@Injectable()
export class ResumesService {
  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    private readonly storageService: ResumeStorageService,
  ) {}

  async findAllForUser(userId: string): Promise<ResumeResponse[]> {
    const resume = await this.resumeModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    return resume ? [toResumeResponse(resume)] : [];
  }

  async upload(
    user: UserDocument,
    file: Express.Multer.File,
  ): Promise<ResumeResponse> {
    this.validateFile(file);

    const userId = user._id.toString();
    const existing = await this.resumeModel.findOne({ userId: user._id }).exec();

    if (existing) {
      await this.storageService.delete(existing.storagePath);
      await this.resumeModel.deleteOne({ _id: existing._id }).exec();
    }

    const { storagePath } = await this.storageService.save(userId, file);
    const displayName = file.originalname.replace(/\.[^/.]+$/, '') || 'Resume';
    const resumeId = new Types.ObjectId();

    const resume = await this.resumeModel.create({
      _id: resumeId,
      userId: user._id,
      name: displayName,
      fileName: file.originalname,
      url: this.storageService.buildFileUrl(resumeId.toString()),
      storagePath,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      skillsExtracted: [],
      isPrimary: true,
    });

    return toResumeResponse(resume);
  }

  async deleteForUser(userId: string, resumeId: string): Promise<void> {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    await this.storageService.delete(resume.storagePath);
    await this.resumeModel.deleteOne({ _id: resume._id }).exec();
  }

  async getFileForUser(
    userId: string,
    resumeId: string,
  ): Promise<{ stream: Readable; resume: ResumeDocument }> {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    try {
      const stream = await this.storageService.openReadStream(
        resume.storagePath,
      );
      return { stream, resume };
    } catch {
      throw new NotFoundException('Resume file not found');
    }
  }

  private validateFile(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      throw new BadRequestException('Resume must be 5MB or smaller');
    }

    if (
      !ALLOWED_RESUME_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_RESUME_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Only PDF resumes are supported');
    }
  }
}
