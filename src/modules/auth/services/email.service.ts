import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(
      this.configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ??
      'JobPilot <onboarding@resend.dev>';
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    rawToken: string,
  ): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${rawToken}`;

    if (this.isDevelopment()) {
      this.logger.log(`Verification link for ${to}: ${verifyUrl}`);
    }

    if (this.shouldSkipResend()) {
      this.logger.warn(
        'Skipping Resend API call in development (placeholder key)',
      );
      return;
    }

    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Verify your JobPilot account',
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for signing up for JobPilot. Click the link below to verify your email:</p>
        <p><a href="${verifyUrl}">Verify email</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, you can ignore this email.</p>
      `,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    rawToken: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${rawToken}`;

    if (this.isDevelopment()) {
      this.logger.log(`Password reset link for ${to}: ${resetUrl}`);
    }

    if (this.shouldSkipResend()) {
      this.logger.warn(
        'Skipping Resend API call in development (placeholder key)',
      );
      return;
    }

    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Reset your JobPilot password',
      html: `
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the link below:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  }

  private isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }

  private shouldSkipResend(): boolean {
    const apiKey = this.configService.get<string>('RESEND_API_KEY') ?? '';
    return (
      this.isDevelopment() &&
      (apiKey.startsWith('re_change_me') || apiKey === 're_test_key')
    );
  }
}
