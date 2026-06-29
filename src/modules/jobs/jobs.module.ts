import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminJobsController } from './admin/admin-jobs.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { Job, JobSchema } from './schemas/job.schema';
import { JobSeedService } from './services/job-seed.service';
import { JobsService } from './services/jobs.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
  ],
  controllers: [AdminJobsController],
  providers: [JobsService, JobSeedService, AdminApiKeyGuard],
  exports: [JobsService, MongooseModule],
})
export class JobsModule {}
