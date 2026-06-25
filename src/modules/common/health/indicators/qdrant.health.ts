import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { QdrantService } from '../../qdrant/qdrant.service';

@Injectable()
export class QdrantHealthIndicator extends HealthIndicator {
  constructor(private readonly qdrantService: QdrantService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.qdrantService.ping();
      return this.getStatus(key, true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Qdrant health check failed';
      throw new HealthCheckError(
        'Qdrant check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
