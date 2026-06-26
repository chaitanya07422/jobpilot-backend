import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleDestroy {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL');
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    this.client = new QdrantClient({
      url,
      apiKey,
      checkCompatibility: false,
    });

    this.logger.log('Qdrant client initialized');
  }

  getClient(): QdrantClient {
    return this.client;
  }

  async ping(): Promise<void> {
    await this.client.getCollections();
  }

  onModuleDestroy() {
    this.logger.log('Qdrant client closed');
  }
}
