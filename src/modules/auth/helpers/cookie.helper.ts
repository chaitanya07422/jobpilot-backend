import { CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';
import { REFRESH_COOKIE_NAME } from '../constants/auth.constants';

export function getRefreshCookieOptions(
  configService: ConfigService,
): CookieOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function getRefreshCookieClearOptions(
  configService: ConfigService,
): CookieOptions {
  return {
    ...getRefreshCookieOptions(configService),
    maxAge: 0,
  };
}

export { REFRESH_COOKIE_NAME };
