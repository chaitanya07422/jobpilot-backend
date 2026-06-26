import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { successResponse } from '../shared/helpers';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import {
  getRefreshCookieClearOptions,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from './helpers/cookie.helper';
import type { UserDocument } from './schemas';
import { AuthService } from './services/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return successResponse(
      { user },
      'Registration successful. Check your email to verify your account.',
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token from link' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return successResponse(null, 'Email verified successfully');
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Resend verification email' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return successResponse(
      null,
      'If an unverified account exists for this email, a verification link has been sent.',
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return successResponse(
      null,
      'If an account exists for this email, a password reset link has been sent.',
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return successResponse(null, 'Password updated successfully');
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google OAuth consent' })
  googleAuth(): void {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    if (!user) {
      const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
      if (!res.headersSent) {
        res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }
      return;
    }

    const { tokens } = await this.authService.issueSessionForUser(user);

    res.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      getRefreshCookieOptions(this.configService),
    );

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback#accessToken=${encodeURIComponent(tokens.accessToken)}`;
    res.redirect(redirectUrl);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);

    res.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      getRefreshCookieOptions(this.configService),
    );

    return successResponse(
      { accessToken: tokens.accessToken, user },
      'Login successful',
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokens = await this.authService.refresh(refreshToken);

    res.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      getRefreshCookieOptions(this.configService),
    );

    return successResponse(
      { accessToken: tokens.accessToken },
      'Token refreshed',
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;
    await this.authService.logout(refreshToken);

    res.clearCookie(
      REFRESH_COOKIE_NAME,
      getRefreshCookieClearOptions(this.configService),
    );

    return successResponse(null, 'Logout successful');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: UserDocument) {
    const profile = await this.authService.getProfile(user._id.toString());
    return successResponse({ user: profile }, 'Success');
  }
}
