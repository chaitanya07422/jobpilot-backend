import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthTokenType } from '../enums/auth-token-type.enum';
import {
  generateRawToken,
  getEmailVerifyExpiry,
  getPasswordResetExpiry,
  hashToken,
} from '../helpers/token.helper';
import { AuthToken, AuthTokenDocument } from '../schemas/auth-token.schema';
import { UserDocument } from '../schemas/user.schema';
import { EmailService } from './email.service';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(AuthToken.name)
    private readonly authTokenModel: Model<AuthTokenDocument>,
    private readonly emailService: EmailService,
  ) {}

  async sendVerificationEmail(user: UserDocument): Promise<void> {
    await this.clearActiveTokens(user._id, AuthTokenType.EmailVerify);

    const rawToken = generateRawToken();

    await this.authTokenModel.create({
      userId: user._id,
      type: AuthTokenType.EmailVerify,
      tokenHash: hashToken(rawToken),
      expiresAt: getEmailVerifyExpiry(),
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      rawToken,
    );
  }

  async sendPasswordResetEmail(user: UserDocument): Promise<void> {
    if (!user.passwordHash) {
      return;
    }

    await this.clearActiveTokens(user._id, AuthTokenType.PasswordReset);

    const rawToken = generateRawToken();

    await this.authTokenModel.create({
      userId: user._id,
      type: AuthTokenType.PasswordReset,
      tokenHash: hashToken(rawToken),
      expiresAt: getPasswordResetExpiry(),
    });

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      rawToken,
    );
  }

  async consumeEmailVerificationToken(
    rawToken: string,
  ): Promise<Types.ObjectId> {
    return this.consumeToken(rawToken, AuthTokenType.EmailVerify);
  }

  async consumePasswordResetToken(rawToken: string): Promise<Types.ObjectId> {
    return this.consumeToken(rawToken, AuthTokenType.PasswordReset);
  }

  private async consumeToken(
    rawToken: string,
    type: AuthTokenType,
  ): Promise<Types.ObjectId> {
    const tokenHash = hashToken(rawToken);
    const authToken = await this.authTokenModel
      .findOne({
        tokenHash,
        type,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!authToken) {
      const message =
        type === AuthTokenType.EmailVerify
          ? 'Invalid or expired verification token'
          : 'Invalid or expired reset token';
      throw new BadRequestException(message);
    }

    authToken.usedAt = new Date();
    await authToken.save();

    return authToken.userId;
  }

  private async clearActiveTokens(
    userId: Types.ObjectId,
    type: AuthTokenType,
  ): Promise<void> {
    await this.authTokenModel
      .deleteMany({
        userId,
        type,
        usedAt: { $exists: false },
      })
      .exec();
  }
}
