import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ResumeVectorPayload, RESUME_PAYLOAD_INDEXES } from './qdrant.types';

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
    await this.ensureResumePayloadIndexes(name);
  }

  async ensureResumePayloadIndexes(collection: string): Promise<void> {
    if (this.payloadIndexesEnsured.has(collection)) {
      return;
    }

    for (const index of RESUME_PAYLOAD_INDEXES) {
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

    this.payloadIndexesEnsured.add(collection);
    this.logger.log(`Resume payload indexes ensured on "${collection}"`);
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
    const collection = this.getResumeCollectionName();
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
