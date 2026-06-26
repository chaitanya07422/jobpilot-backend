import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { RedisService } from '../../common/redis';
import {
  DEFAULT_JWT_ACCESS_EXPIRES_IN,
  DEFAULT_JWT_REFRESH_EXPIRES_IN,
} from '../constants/auth.constants';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../interfaces/jwt-payload.interface';
import { UserDocument } from '../schemas';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly refreshKeyPrefix = 'refresh:';
  private readonly userRefreshSetPrefix = 'user_refresh:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async issueTokenPair(user: UserDocument): Promise<TokenPair> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user._id.toString());
    return { accessToken, refreshToken };
  }

  async validateAndRevokeRefresh(refreshToken: string): Promise<string> {
    const payload = this.verifyRefreshToken(refreshToken);
    const redisKey = `${this.refreshKeyPrefix}${payload.jti}`;
    const exists = await this.redisService.getClient().exists(redisKey);

    if (!exists) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.revokeRefreshTokenByJti(payload.sub, payload.jti);
    return payload.sub;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      await this.revokeRefreshTokenByJti(payload.sub, payload.jti);
    } catch {
      // Ignore invalid tokens on logout
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const setKey = `${this.userRefreshSetPrefix}${userId}`;
    const client = this.redisService.getClient();
    const jtis = await client.smembers(setKey);

    if (jtis.length > 0) {
      const keys = jtis.map((jti) => `${this.refreshKeyPrefix}${jti}`);
      await client.del(...keys);
    }

    await client.del(setKey);
  }

  private signAccessToken(user: UserDocument): string {
    const payload: AccessTokenPayload = {
      sub: user._id.toString(),
      email: user.email,
    };

    return this.jwtService.sign(payload, {
      secret: this.getAccessSecret(),
      expiresIn: this.getAccessExpiresIn() as StringValue,
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = {
      sub: userId,
      jti,
    };

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: this.getRefreshExpiresIn() as StringValue,
    });

    const redisKey = `${this.refreshKeyPrefix}${jti}`;
    const setKey = `${this.userRefreshSetPrefix}${userId}`;
    const ttlSeconds = this.getRefreshTtlSeconds();
    const client = this.redisService.getClient();

    await client
      .multi()
      .set(redisKey, userId, 'EX', ttlSeconds)
      .sadd(setKey, jti)
      .expire(setKey, ttlSeconds)
      .exec();

    return refreshToken;
  }

  private verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async revokeRefreshTokenByJti(
    userId: string,
    jti: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    await client
      .multi()
      .del(`${this.refreshKeyPrefix}${jti}`)
      .srem(`${this.userRefreshSetPrefix}${userId}`, jti)
      .exec();
  }

  private getAccessSecret(): string {
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private getRefreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private getAccessExpiresIn(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      DEFAULT_JWT_ACCESS_EXPIRES_IN
    );
  }

  private getRefreshExpiresIn(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      DEFAULT_JWT_REFRESH_EXPIRES_IN
    );
  }

  private getRefreshTtlSeconds(): number {
    const expiry = this.getRefreshExpiresIn();
    const value = parseInt(expiry, 10);

    if (expiry.endsWith('d')) return value * 86_400;
    if (expiry.endsWith('h')) return value * 3_600;
    if (expiry.endsWith('m')) return value * 60;
    if (expiry.endsWith('s')) return value;

    return 7 * 86_400;
  }
}
