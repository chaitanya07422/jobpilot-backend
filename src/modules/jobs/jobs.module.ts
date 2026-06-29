import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { AdminJobsController } from './admin/admin-jobs.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { Job, JobSchema } from './schemas/job.schema';
import { JobSeedService } from './services/job-seed.service';
import { JobEmbeddingTextService } from './services/job-embedding-text.service';
import { JobVectorService } from './services/job-vector.service';
import { JobsService } from './services/jobs.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    EmbeddingsModule,
  ],
  controllers: [AdminJobsController],
  providers: [
    JobsService,
    JobSeedService,
    JobEmbeddingTextService,
    JobVectorService,
    AdminApiKeyGuard,
  ],
  exports: [JobsService, JobVectorService, MongooseModule],
})
export class JobsModule {}
