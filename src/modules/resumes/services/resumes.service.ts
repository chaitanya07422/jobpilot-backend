import {
  BadRequestException,
  Injectable,
  Logger,
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
import { ExtractionStatus } from '../enums/extraction-status.enum';
import { ResumeExtractionService } from '../extraction/resume-extraction.service';
import {
  dedupeSkills,
  normalizeExtractedProfile,
} from '../extraction/resume-profile.validator';
import { ResumeProfileResponse } from '../interfaces/resume-profile.interface';
import {
  ResumeResponse,
  toResumeProfileResponse,
  toResumeResponse,
} from '../interfaces/resume-response.interface';
import { UpdateResumeProfileDto } from '../dto/update-resume-profile.dto';
import { Resume, ResumeDocument } from '../schemas';
import {
  ResumeProfile,
  ResumeProfileDocument,
} from '../schemas/resume-profile.schema';
import { ResumeStorageService } from './resume-storage.service';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    @InjectModel(ResumeProfile.name)
    private readonly resumeProfileModel: Model<ResumeProfileDocument>,
    private readonly storageService: ResumeStorageService,
    private readonly extractionService: ResumeExtractionService,
  ) {}

  async findAllForUser(userId: string): Promise<ResumeResponse[]> {
    const resume = await this.resumeModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!resume) return [];

    const profile = await this.extractionService.findByResumeId(
      resume._id.toString(),
    );

    return [
      toResumeResponse(
        resume,
        this.storageService.buildFileUrl(resume._id.toString()),
        profile,
      ),
    ];
  }

  async upload(
    user: UserDocument,
    file: Express.Multer.File,
  ): Promise<ResumeResponse> {
    this.validateFile(file);

    const userId = user._id.toString();
    const existing = await this.resumeModel
      .findOne({ userId: user._id })
      .exec();

    if (existing) {
      await this.storageService.delete(existing.storagePath);
      await this.extractionService.deleteByResumeId(existing._id.toString());
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

    let profile: ResumeProfileDocument | null = null;

    try {
      profile = await this.extractionService.extractAndSave({
        resumeId: resume._id,
        userId: user._id,
        pdfBuffer: file.buffer,
      });

      resume.skillsExtracted =
        this.extractionService.getSkillsForResume(profile);
      await resume.save();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Resume extraction failed';
      this.logger.error(
        `Upload extraction failed for resume ${resume._id.toString()}: ${message}`,
      );
      profile = await this.extractionService.findByResumeId(
        resume._id.toString(),
      );
    }

    return toResumeResponse(
      resume,
      this.storageService.buildFileUrl(resume._id.toString()),
      profile,
    );
  }

  async getProfileForUser(userId: string): Promise<ResumeProfileResponse> {
    const profile = await this.extractionService.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Resume profile not found');
    }

    return toResumeProfileResponse(profile);
  }

  async updateProfileForUser(
    userId: string,
    dto: UpdateResumeProfileDto,
  ): Promise<ResumeProfileResponse> {
    const resume = await this.resumeModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const profile = await this.resumeProfileModel
      .findOne({ resumeId: resume._id })
      .exec();

    if (!profile) {
      throw new NotFoundException('Resume profile not found');
    }

    if (dto.summary !== undefined) profile.summary = dto.summary;
    if (dto.totalYearsExperience !== undefined) {
      profile.totalYearsExperience = dto.totalYearsExperience;
    }
    if (dto.skills !== undefined) profile.skills = dto.skills;
    if (dto.technologies !== undefined) profile.technologies = dto.technologies;
    if (dto.experience !== undefined) {
      profile.experience =
        normalizeExtractedProfile({ experience: dto.experience }).experience ??
        [];
    }
    if (dto.education !== undefined) {
      profile.education =
        normalizeExtractedProfile({ education: dto.education }).education ?? [];
    }
    if (dto.projects !== undefined) {
      profile.projects =
        normalizeExtractedProfile({ projects: dto.projects }).projects ?? [];
    }
    if (dto.certifications !== undefined)
      profile.certifications = dto.certifications;
    if (dto.languages !== undefined) profile.languages = dto.languages;
    if (dto.otherSections !== undefined) {
      profile.otherSections =
        normalizeExtractedProfile({ otherSections: dto.otherSections })
          .otherSections ?? [];
    }

    if (profile.extractionStatus === ExtractionStatus.Confirmed) {
      profile.extractionStatus = ExtractionStatus.ReadyForReview;
      profile.profileConfirmedAt = undefined;
    }

    await profile.save();

    resume.skillsExtracted = dedupeSkills({
      skills: profile.skills,
      technologies: profile.technologies,
    });
    await resume.save();

    return toResumeProfileResponse(profile);
  }

  async confirmProfileForUser(userId: string): Promise<ResumeProfileResponse> {
    const profile = await this.extractionService.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Resume profile not found');
    }

    if (profile.extractionStatus === ExtractionStatus.Failed) {
      throw new BadRequestException(
        'Cannot confirm a failed extraction. Re-upload your resume or edit the profile.',
      );
    }

    profile.extractionStatus = ExtractionStatus.Confirmed;
    profile.profileConfirmedAt = new Date();
    await profile.save();

    return toResumeProfileResponse(profile);
  }

  async deleteForUser(userId: string, resumeId: string): Promise<void> {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    await this.storageService.delete(resume.storagePath);
    await this.extractionService.deleteByResumeId(resume._id.toString());
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
