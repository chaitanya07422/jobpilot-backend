import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.isGoogleOAuthEnabled()) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(): { prompt: string } {
    return { prompt: 'select_account' };
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (!user) {
      const res = context
        .switchToHttp()
        .getResponse<{ headersSent: boolean; redirect: (url: string) => void }>();
      const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
      const message = this.getFailureMessage(err, info);

      if (!res.headersSent) {
        res.redirect(
          `${frontendUrl}/login?error=google_auth_failed&reason=${encodeURIComponent(message)}`,
        );
      }

      throw err ?? new UnauthorizedException(message);
    }

    return user;
  }

  private getFailureMessage(err: Error | null, info: unknown): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }

    if (
      info &&
      typeof info === 'object' &&
      'message' in info &&
      typeof info.message === 'string'
    ) {
      return info.message;
    }

    return 'Google authentication failed';
  }

  private isGoogleOAuthEnabled(): boolean {
    return !!(
      this.configService.get<string>('GOOGLE_CLIENT_ID') &&
      this.configService.get<string>('GOOGLE_CLIENT_SECRET') &&
      this.configService.get<string>('GOOGLE_CALLBACK_URL')
    );
  }
}
