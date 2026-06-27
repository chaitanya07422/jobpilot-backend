import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExtractionStatus } from '../enums/extraction-status.enum';
import { GeminiResumeExtractorService } from './gemini-resume-extractor.service';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { dedupeSkills } from './resume-profile.validator';
import { ResumeTextTrimmerService } from './resume-text-trimmer.service';
import {
  ResumeProfile,
  ResumeProfileDocument,
} from '../schemas/resume-profile.schema';

@Injectable()
export class ResumeExtractionService {
  private readonly logger = new Logger(ResumeExtractionService.name);

  constructor(
    @InjectModel(ResumeProfile.name)
    private readonly resumeProfileModel: Model<ResumeProfileDocument>,
    private readonly pdfTextExtractor: PdfTextExtractorService,
    private readonly textTrimmer: ResumeTextTrimmerService,
    private readonly geminiExtractor: GeminiResumeExtractorService,
  ) {}

  async findByResumeId(
    resumeId: string,
  ): Promise<ResumeProfileDocument | null> {
    return this.resumeProfileModel
      .findOne({ resumeId: new Types.ObjectId(resumeId) })
      .exec();
  }

  async findByUserId(userId: string): Promise<ResumeProfileDocument | null> {
    return this.resumeProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async deleteByResumeId(resumeId: string): Promise<void> {
    await this.resumeProfileModel
      .deleteOne({ resumeId: new Types.ObjectId(resumeId) })
      .exec();
  }

  async extractAndSave(params: {
    resumeId: Types.ObjectId;
    userId: Types.ObjectId;
    pdfBuffer: Buffer;
  }): Promise<ResumeProfileDocument> {
    const { resumeId, userId, pdfBuffer } = params;

    const profileDoc = await this.resumeProfileModel
      .findOneAndUpdate(
        { resumeId },
        {
          $set: {
            userId,
            extractionStatus: ExtractionStatus.Processing,
            extractionError: undefined,
          },
          $setOnInsert: {
            skills: [],
            technologies: [],
            experience: [],
            education: [],
            projects: [],
            certifications: [],
            languages: [],
            otherSections: [],
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec();

    if (!profileDoc) {
      throw new Error('Failed to create resume profile record');
    }

    try {
      this.logger.log(`Extracting PDF text for resume ${resumeId.toString()}`);
      const fullText = await this.pdfTextExtractor.extractFromBuffer(pdfBuffer);
      const trimmedText = this.textTrimmer.trimLinks(fullText);
      this.logger.log(
        `PDF parsed (${fullText.length} chars, ${trimmedText.length} after trim)`,
      );

      const extracted = await this.geminiExtractor.extract(trimmedText);
      this.logger.log(
        `Gemini extraction complete for resume ${resumeId.toString()}`,
      );

      profileDoc.summary = extracted.summary || undefined;
      profileDoc.totalYearsExperience =
        extracted.totalYearsExperience ?? undefined;
      profileDoc.skills = extracted.skills ?? [];
      profileDoc.technologies = extracted.technologies ?? [];
      profileDoc.experience = extracted.experience ?? [];
      profileDoc.education = extracted.education ?? [];
      profileDoc.projects = extracted.projects ?? [];
      profileDoc.certifications = extracted.certifications ?? [];
      profileDoc.languages = extracted.languages ?? [];
      profileDoc.otherSections = extracted.otherSections ?? [];
      profileDoc.extractionStatus = ExtractionStatus.ReadyForReview;
      profileDoc.extractionError = undefined;
      profileDoc.profileConfirmedAt = undefined;

      await profileDoc.save();
      return profileDoc;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Resume extraction failed';

      profileDoc.extractionStatus = ExtractionStatus.Failed;
      profileDoc.extractionError = message;
      await profileDoc.save();

      this.logger.error(
        `Extraction failed for resume ${resumeId.toString()}: ${message}`,
      );
      throw error;
    }
  }

  getSkillsForResume(profile: ResumeProfileDocument | null): string[] {
    if (!profile) return [];
    return dedupeSkills({
      skills: profile.skills,
      technologies: profile.technologies,
    });
  }
}
