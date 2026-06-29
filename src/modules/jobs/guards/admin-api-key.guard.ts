import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const adminKey = this.configService.get<string>('ADMIN_API_KEY')?.trim();

    if (!adminKey) {
      throw new ServiceUnavailableException(
        'Admin API is not configured (ADMIN_API_KEY missing)',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided =
      request.header('x-admin-key') ?? request.header('X-Admin-Key');

    if (!provided || provided !== adminKey) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }
}
