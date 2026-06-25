import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { QdrantModule } from '../qdrant';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { QdrantHealthIndicator } from './indicators/qdrant.health';

@Module({
  imports: [TerminusModule, QdrantModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, QdrantHealthIndicator],
})
export class HealthModule {}
