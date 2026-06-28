import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EmbeddingsModule } from '../embeddings';
import { AuthModule } from '../auth/auth.module';
import { LlmPromptsModule } from '../llm-prompts/llm-prompts.module';
import { ResumesController } from './resumes.controller';
import {
  Resume,
  ResumeSchema,
  ResumeProfile,
  ResumeProfileSchema,
} from './schemas';
import { LocalResumeStorage } from './storage/local-resume.storage';
import { OciResumeStorage } from './storage/oci-resume.storage';
import { RESUME_STORAGE_BACKEND } from './storage/resume-storage.backend';
import {
  GeminiResumeExtractorService,
  PdfTextExtractorService,
  ResumeExtractionService,
  ResumeTextTrimmerService,
} from './extraction';
import { ProfileEmbeddingStep, ResumePipelineService } from './pipeline';
import {
  ResumeLimitService,
  ResumeStorageService,
  ResumeVectorService,
  ResumesService,
} from './services';

@Module({
  imports: [
    AuthModule,
    EmbeddingsModule,
    LlmPromptsModule,
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: ResumeProfile.name, schema: ResumeProfileSchema },
    ]),
  ],
  controllers: [ResumesController],
  providers: [
    ResumesService,
    ResumeStorageService,
    ResumeLimitService,
    ResumeVectorService,
    ResumePipelineService,
    ProfileEmbeddingStep,
    ResumeExtractionService,
    PdfTextExtractorService,
    ResumeTextTrimmerService,
    GeminiResumeExtractorService,
    LocalResumeStorage,
    OciResumeStorage,
    {
      provide: RESUME_STORAGE_BACKEND,
      inject: [ConfigService, LocalResumeStorage, OciResumeStorage],
      useFactory: (
        configService: ConfigService,
        localStorage: LocalResumeStorage,
        ociStorage: OciResumeStorage,
      ) => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 'local');
        return provider === 'oci' ? ociStorage : localStorage;
      },
    },
  ],
  exports: [ResumesService],
})
export class ResumesModule {}
