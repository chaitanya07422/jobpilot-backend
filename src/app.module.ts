import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './modules/common/config';
import { DatabaseModule } from './modules/common/database';
import { RedisModule } from './modules/common/redis';
import { QdrantModule } from './modules/common/qdrant';
import { HealthModule } from './modules/common/health';
import { AuthModule } from './modules/auth';
import { ResumesModule } from './modules/resumes';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    QdrantModule,
    HealthModule,
    AuthModule,
    ResumesModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
