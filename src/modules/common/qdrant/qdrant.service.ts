import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ResumeVectorPayload, RESUME_PAYLOAD_INDEXES, JOB_PAYLOAD_INDEXES, JobVectorPayload } from './qdrant.types';

@Injectable()
export class QdrantService implements OnModuleDestroy {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private payloadIndexesEnsured = new Set<string>();

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL');
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    this.client = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
      checkCompatibility: false,
    });

    this.logger.log(`Qdrant client initialized (${url})`);
  }

  isEnabled(): boolean {
    return this.configService.get<string>('QDRANT_ENABLED', 'true') !== 'false';
  }

  getClient(): QdrantClient {
    return this.client;
  }

  getResumeCollectionName(): string {
    return (
      this.configService.get<string>('QDRANT_COLLECTION_RESUMES') ||
      'jobpilot_resumes'
    );
  }

  getJobCollectionName(): string {
    return (
      this.configService.get<string>('QDRANT_COLLECTION_JOBS') ||
      'jobpilot_jobs'
    );
  }

  async ping(): Promise<void> {
    await this.client.getCollections();
  }

  async ensureCollection(name: string, vectorSize: number): Promise<void> {
    const { collections } = await this.client.getCollections();
    const exists = collections.some((collection) => collection.name === name);

    if (exists) {
      return;
    }

    await this.client.createCollection(name, {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    });

    this.logger.log(`Created Qdrant collection "${name}" (${vectorSize}-dim)`);
  }

  private async ensurePayloadIndexes(
    collection: string,
    indexes: ReadonlyArray<{
      field_name: string;
      field_schema: 'keyword' | 'float' | 'bool' | 'datetime';
    }>,
    label: string,
  ): Promise<void> {
    const cacheKey = `${collection}:${label}`;
    if (this.payloadIndexesEnsured.has(cacheKey)) {
      return;
    }

    for (const index of indexes) {
      try {
        await this.client.createPayloadIndex(collection, {
          field_name: index.field_name,
          field_schema: index.field_schema,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes('already exists')) {
          this.logger.warn(
            `Payload index "${index.field_name}" on "${collection}": ${message}`,
          );
        }
      }
    }

    this.payloadIndexesEnsured.add(cacheKey);
    this.logger.log(`${label} payload indexes ensured on "${collection}"`);
  }

  async ensureResumePayloadIndexes(collection: string): Promise<void> {
    await this.ensurePayloadIndexes(collection, RESUME_PAYLOAD_INDEXES, 'Resume');
  }

  async ensureJobPayloadIndexes(collection: string): Promise<void> {
    await this.ensurePayloadIndexes(collection, JOB_PAYLOAD_INDEXES, 'Job');
  }

  async upsertResumePoint(params: {
    pointId: string;
    vector: number[];
    payload: ResumeVectorPayload;
  }): Promise<void> {
    const collection = this.getResumeCollectionName();
    await this.ensureCollection(collection, params.vector.length);
    await this.ensureResumePayloadIndexes(collection);

    await this.client.upsert(collection, {
      wait: true,
      points: [
        {
          id: params.pointId,
          vector: params.vector,
          payload: params.payload as unknown as Record<string, unknown>,
        },
      ],
    });
  }

  async deleteResumePoint(pointId: string): Promise<void> {
    await this.deletePoint(this.getResumeCollectionName(), pointId);
  }

  async upsertJobPoint(params: {
    pointId: string;
    vector: number[];
    payload: JobVectorPayload;
  }): Promise<void> {
    const collection = this.getJobCollectionName();
    await this.ensureCollection(collection, params.vector.length);
    await this.ensureJobPayloadIndexes(collection);

    await this.client.upsert(collection, {
      wait: true,
      points: [
        {
          id: params.pointId,
          vector: params.vector,
          payload: params.payload as unknown as Record<string, unknown>,
        },
      ],
    });
  }

  async deleteJobPoint(pointId: string): Promise<void> {
    await this.deletePoint(this.getJobCollectionName(), pointId);
  }

  private async deletePoint(collection: string, pointId: string): Promise<void> {
    const { collections } = await this.client.getCollections();
    const exists = collections.some((c) => c.name === collection);

    if (!exists) {
      return;
    }

    await this.client.delete(collection, {
      wait: true,
      points: [pointId],
    });
  }

  onModuleDestroy() {
    this.logger.log('Qdrant client closed');
  }
}
