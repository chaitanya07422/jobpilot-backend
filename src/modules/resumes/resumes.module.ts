import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ResumesController } from './resumes.controller';
import { Resume, ResumeSchema } from './schemas';
import { LocalResumeStorage } from './storage/local-resume.storage';
import { OciResumeStorage } from './storage/oci-resume.storage';
import { RESUME_STORAGE_BACKEND } from './storage/resume-storage.backend';
import { ResumeStorageService, ResumesService } from './services';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }]),
  ],
  controllers: [ResumesController],
  providers: [
    ResumesService,
    ResumeStorageService,
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
