import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmbeddingService,
  toQdrantPointId,
} from '../../embeddings';
import { JobEmbeddingTextService } from './job-embedding-text.service';
import { QdrantService } from '../../common/qdrant/qdrant.service';
import { JobCatalogStatus } from '../enums/job-status.enum';
import { JobEmbedResult } from '../interfaces/job-response.interface';
import { Job, JobDocument } from '../schemas/job.schema';
import { buildJobVectorPayload } from '../utils/build-job-vector-payload.util';

@Injectable()
export class JobVectorService {
  private readonly logger = new Logger(JobVectorService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly jobTextService: JobEmbeddingTextService,
    private readonly qdrantService: QdrantService,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  async syncActiveJob(job: JobDocument): Promise<boolean> {
    if (job.status !== JobCatalogStatus.Active) {
      await this.removeJob(job);
      return false;
    }

    if (!this.qdrantService.isEnabled()) {
      this.logger.warn('Qdrant job sync skipped — QDRANT_ENABLED=false');
      return false;
    }

    const text = this.jobTextService.build(job);
    if (!text) {
      await this.recordSyncFailure(job, 'Job has no embeddable content');
      return false;
    }

    const textHash = createHash('sha256').update(text).digest('hex');

    if (job.qdrantSyncedAt && job.embeddingTextHash === textHash) {
      this.logger.log(
        `Skipping Qdrant sync for job ${job._id.toString()} — hash unchanged`,
      );
      return false;
    }

    try {
      const vector = await this.embeddingService.embed(text);
      const jobId = job._id.toString();
      const pointId = toQdrantPointId(jobId);

      await this.qdrantService.upsertJobPoint({
        pointId,
        vector,
        payload: buildJobVectorPayload(
          job,
          this.embeddingService.modelId,
          textHash,
        ),
      });

      job.qdrantSyncedAt = new Date();
      job.qdrantSyncError = undefined;
      job.embeddingModel = this.embeddingService.modelId;
      job.embeddingTextHash = textHash;
      job.qdrantPointId = pointId;
      await job.save();

      this.logger.log(`Qdrant vector synced for job ${jobId}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordSyncFailure(job, message);
      this.logger.error(`Qdrant job sync failed for ${job._id.toString()}: ${message}`);
      return false;
    }
  }

  async removeJob(job: JobDocument): Promise<void> {
    if (!this.qdrantService.isEnabled()) {
      return;
    }

    const pointId = job.qdrantPointId ?? toQdrantPointId(job._id.toString());

    if (job.qdrantPointId || job.qdrantSyncedAt) {
      try {
        await this.qdrantService.deleteJobPoint(pointId);
        this.logger.log(`Deleted Qdrant vector for job ${job._id.toString()}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to delete Qdrant vector for job ${job._id.toString()}: ${message}`,
        );
      }
    }

    job.qdrantSyncedAt = undefined;
    job.qdrantSyncError = undefined;
    job.embeddingModel = undefined;
    job.embeddingTextHash = undefined;
    job.qdrantPointId = undefined;
    await job.save();
  }

  async embedAllActive(): Promise<JobEmbedResult> {
    const jobs = await this.jobModel
      .find({ status: JobCatalogStatus.Active })
      .exec();

    const result: JobEmbedResult = { synced: 0, skipped: 0, failed: 0 };

    for (const job of jobs) {
      try {
        const synced = await this.syncActiveJob(job);
        if (synced) {
          result.synced += 1;
        } else if (job.qdrantSyncError) {
          result.failed += 1;
        } else {
          result.skipped += 1;
        }
      } catch {
        result.failed += 1;
      }
    }

    return result;
  }

  private async recordSyncFailure(
    job: JobDocument,
    message: string,
  ): Promise<void> {
    job.qdrantSyncError = message;
    await job.save();
  }
}
