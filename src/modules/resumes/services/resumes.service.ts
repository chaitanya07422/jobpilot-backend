import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Readable } from 'stream';
import { User, UserDocument } from '../../auth/schemas';
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
import { ResumeQuotaResponse } from '../interfaces/resume-quota.interface';
import {
  ResumeResponse,
  toResumeProfileResponse,
  toResumeResponse,
} from '../interfaces/resume-response.interface';
import { UpdateResumeProfileDto } from '../dto/update-resume-profile.dto';
import { ResumePipelineService } from '../pipeline/resume-pipeline.service';
import { Resume, ResumeDocument } from '../schemas';
import {
  ResumeProfile,
  ResumeProfileDocument,
} from '../schemas/resume-profile.schema';
import { ResumeLimitService } from './resume-limit.service';
import { ResumeStorageService } from './resume-storage.service';
import { ResumeVectorService } from './resume-vector.service';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    @InjectModel(ResumeProfile.name)
    private readonly resumeProfileModel: Model<ResumeProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly storageService: ResumeStorageService,
    private readonly extractionService: ResumeExtractionService,
    private readonly resumeLimitService: ResumeLimitService,
    private readonly resumeVectorService: ResumeVectorService,
    private readonly resumePipelineService: ResumePipelineService,
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

  async getQuotaForUser(user: UserDocument): Promise<ResumeQuotaResponse> {
    const syncedUser = await this.syncUploadCountWithResumeState(user._id);
    const profile = await this.extractionService.findByUserId(
      syncedUser._id.toString(),
    );
    const canRetryAfterFailure =
      profile?.extractionStatus === ExtractionStatus.Failed;

    return this.resumeLimitService.getQuota(syncedUser, {
      canRetryAfterFailure,
    });
  }

  /** Fix legacy counts from failed uploads that were charged before extraction succeeded. */
  private async syncUploadCountWithResumeState(
    userId: Types.ObjectId,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resume = await this.resumeModel.findOne({ userId }).exec();
    const profile = await this.extractionService.findByUserId(userId.toString());
    const limit = this.resumeLimitService.getUploadLimit(user);
    const count = user.resumeUploadCount ?? 0;

    if (count === 0) {
      return user;
    }

    const shouldReset =
      !resume ||
      (profile?.extractionStatus === ExtractionStatus.Failed &&
        limit !== null &&
        count >= limit);

    if (!shouldReset) {
      return user;
    }

    await this.userModel
      .updateOne({ _id: userId }, { $set: { resumeUploadCount: 0 } })
      .exec();
    user.resumeUploadCount = 0;
    this.logger.log(
      `Reset resume upload count for user ${userId.toString()} (no successful upload on file)`,
    );

    return user;
  }

  async upload(
    user: UserDocument,
    file: Express.Multer.File,
  ): Promise<ResumeResponse> {
    this.validateFile(file);

    user = await this.syncUploadCountWithResumeState(user._id);

    const userId = user._id.toString();
    const existing = await this.resumeModel
      .findOne({ userId: user._id })
      .exec();

    const existingProfile = existing
      ? await this.extractionService.findByResumeId(existing._id.toString())
      : null;
    const isRetryAfterFailure =
      existingProfile?.extractionStatus === ExtractionStatus.Failed;

    this.resumeLimitService.assertCanUpload(user, {
      allowRetryAfterFailure: isRetryAfterFailure,
    });

    if (existing) {
      await this.storageService.delete(existing.storagePath);
      await this.resumeVectorService.deleteForUser(userId);
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
        profileEditLimit: this.resumeLimitService.getProfileEditLimit(),
      });

      resume.skillsExtracted =
        this.extractionService.getSkillsForResume(profile);
      await resume.save();

      await this.userModel
        .updateOne({ _id: user._id }, { $inc: { resumeUploadCount: 1 } })
        .exec();
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

    const editLimit =
      profile.profileEditLimit ?? this.resumeLimitService.getProfileEditLimit();

    if (profile.extractionStatus === ExtractionStatus.Confirmed) {
      if (profile.profileEditCount >= editLimit) {
        throw new ForbiddenException(
          'Edit limit reached. Upload a new resume to make more changes.',
        );
      }
    } else if (profile.extractionStatus !== ExtractionStatus.ReadyForReview) {
      throw new ForbiddenException(
        'Profile cannot be edited in its current state.',
      );
    }

    if (profile.profileEditCount >= editLimit) {
      throw new ForbiddenException(
        `Edit limit reached (${editLimit}). Confirm your profile or re-upload your resume.`,
      );
    }

    this.applyProfileUpdates(profile, dto);
    profile.profileEditCount += 1;
    await profile.save();

    resume.skillsExtracted = dedupeSkills({
      skills: profile.skills,
      technologies: profile.technologies,
    });
    await resume.save();

    if (profile.extractionStatus === ExtractionStatus.Confirmed) {
      try {
        await this.resumeVectorService.syncConfirmedProfile(profile);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Qdrant sync failed';
        this.logger.error(
          `Qdrant re-sync failed after profile edit for user ${userId}: ${message}`,
          error instanceof Error ? error.stack : undefined,
        );
        await this.resumeVectorService.recordSyncFailure(profile, message);
      }
    }

    return toResumeProfileResponse(profile);
  }

  async confirmProfileForUser(
    userId: string,
    dto?: UpdateResumeProfileDto,
  ): Promise<ResumeProfileResponse> {
    const profile = await this.extractionService.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Resume profile not found');
    }

    if (profile.extractionStatus === ExtractionStatus.Failed) {
      throw new BadRequestException(
        'Cannot confirm a failed extraction. Re-upload your resume or edit the profile.',
      );
    }

    if (dto && Object.keys(dto).length > 0) {
      if (profile.extractionStatus === ExtractionStatus.Confirmed) {
        throw new ForbiddenException(
          'Profile is already confirmed. Re-upload your resume to make changes.',
        );
      }

      this.applyProfileUpdates(profile, dto);
    }

    profile.extractionStatus = ExtractionStatus.Confirmed;
    profile.profileConfirmedAt = new Date();
    await profile.save();

    const resume = await this.resumeModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (resume) {
      resume.skillsExtracted = dedupeSkills({
        skills: profile.skills,
        technologies: profile.technologies,
      });
      await resume.save();
    }

    try {
      await this.resumePipelineService.runConfirmPipeline(profile);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Qdrant sync failed';
      this.logger.error(
        `Qdrant sync failed for user ${userId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.resumeVectorService.recordSyncFailure(profile, message);
    }

    return toResumeProfileResponse(
      (await this.extractionService.findByUserId(userId)) ?? profile,
    );
  }

  async deleteForUser(userId: string, resumeId: string): Promise<void> {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    await this.storageService.delete(resume.storagePath);
    await this.resumeVectorService.deleteForUser(userId);
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

  private applyProfileUpdates(
    profile: ResumeProfileDocument,
    dto: UpdateResumeProfileDto,
  ): void {
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
    if (dto.certifications !== undefined) {
      profile.certifications = dto.certifications;
    }
    if (dto.languages !== undefined) profile.languages = dto.languages;
    if (dto.otherSections !== undefined) {
      profile.otherSections =
        normalizeExtractedProfile({ otherSections: dto.otherSections })
          .otherSections ?? [];
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
