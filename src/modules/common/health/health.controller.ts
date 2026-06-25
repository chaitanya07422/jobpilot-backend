import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { RedisHealthIndicator } from './indicators/redis.health';
import { QdrantHealthIndicator } from './indicators/qdrant.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly qdrant: QdrantHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Application health check' })
  async check() {
    const checks = [
      () => this.mongoose.pingCheck('mongodb'),
      () => this.redis.isHealthy('redis'),
    ];

    if (
      this.configService.get<string>('HEALTH_CHECK_QDRANT', 'true') === 'true'
    ) {
      checks.push(() => this.qdrant.isHealthy('qdrant'));
    }

    const healthResult = await this.health.check(checks);

    return {
      success: true,
      data: {
        status: healthResult.status,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: process.env.npm_package_version || '0.0.1',
        environment: this.configService.get<string>('NODE_ENV'),
        details: healthResult.details,
      },
      message: 'Health check completed',
    };
  }
}
