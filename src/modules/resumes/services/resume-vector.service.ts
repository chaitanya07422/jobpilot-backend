import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  EmbeddingService,
  ProfileEmbeddingTextService,
  toQdrantPointId,
} from '../../embeddings';
import { QdrantService } from '../../common/qdrant/qdrant.service';
import { ResumeProfileDocument } from '../schemas/resume-profile.schema';
import { buildResumeVectorPayload } from '../utils/build-resume-vector-payload.util';

@Injectable()
export class ResumeVectorService {
  private readonly logger = new Logger(ResumeVectorService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly profileTextService: ProfileEmbeddingTextService,
    private readonly qdrantService: QdrantService,
  ) {}

  async syncConfirmedProfile(profile: ResumeProfileDocument): Promise<boolean> {
    if (!this.qdrantService.isEnabled()) {
      this.logger.warn('Qdrant sync skipped — QDRANT_ENABLED=false');
      return false;
    }

    const text = this.profileTextService.build(profile);
    if (!text) {
      throw new BadRequestException(
        'Profile is empty — add content before confirming.',
      );
    }

    const textHash = createHash('sha256').update(text).digest('hex');

    if (profile.qdrantSyncedAt && profile.embeddingTextHash === textHash) {
      this.logger.log(
        `Skipping Qdrant sync for resume ${profile.resumeId.toString()} — hash unchanged`,
      );
      return false;
    }

    const vector = await this.embeddingService.embed(text);
    const userId = profile.userId.toString();
    const pointId = toQdrantPointId(userId);

    await this.qdrantService.upsertResumePoint({
      pointId,
      vector,
      payload: buildResumeVectorPayload(
        profile,
        this.embeddingService.modelId,
        textHash,
      ),
    });

    profile.qdrantSyncedAt = new Date();
    profile.qdrantSyncError = undefined;
    profile.embeddingModel = this.embeddingService.modelId;
    profile.embeddingTextHash = textHash;
    profile.qdrantPointId = pointId;

    await profile.save();

    this.logger.log(`Qdrant vector synced for user ${userId}`);
    return true;
  }

  async recordSyncFailure(
    profile: ResumeProfileDocument,
    message: string,
  ): Promise<void> {
    profile.qdrantSyncError = message;
    await profile.save();
  }

  async deleteForUser(userId: string): Promise<void> {
    if (!this.qdrantService.isEnabled()) {
      return;
    }

    const pointId = toQdrantPointId(userId);
    await this.qdrantService.deleteResumePoint(pointId);
    this.logger.log(`Deleted Qdrant vector for user ${userId}`);
  }
}
