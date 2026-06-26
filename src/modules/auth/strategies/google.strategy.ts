import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from '../services/auth.service';
import { UserDocument } from '../schemas';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    super({
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      callbackURL:
        callbackURL || 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<UserDocument> {
    const emailEntry = profile.emails?.[0];
    const email = emailEntry?.value;

    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    // Google userinfo may omit `verified`; the email scope only returns verified addresses.
    const emailVerified = emailEntry.verified ?? true;

    if (!emailVerified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    return this.authService.findOrCreateGoogleUser({
      googleId: profile.id,
      email,
      emailVerified,
      name: profile.displayName || email.split('@')[0],
    });
  }
}
