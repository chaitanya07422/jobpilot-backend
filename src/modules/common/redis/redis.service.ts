import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private connectionErrorLogged = false;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    this.client.on('connect', () => {
      this.connectionErrorLogged = false;
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      if (!this.connectionErrorLogged) {
        this.connectionErrorLogged = true;
        const message = err.message || 'connection refused';
        this.logger.warn(
          `Redis unavailable (${message}). For local dev: docker compose up -d`,
        );
      }
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch {
      // Error handler above logs once; auth refresh will fail until Redis is up
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client.status === 'end' || this.client.status === 'close') {
      return;
    }
    await this.client.quit();
    this.logger.log('Redis client closed');
  }
}
