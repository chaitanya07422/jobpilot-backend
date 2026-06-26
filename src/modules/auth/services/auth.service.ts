import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthProvider } from '../enums/auth-provider.enum';
import { GoogleProfileData } from '../interfaces/google-profile.interface';
import { RegisterDto, LoginDto, ResetPasswordDto } from '../dto';
import {
  toUserResponse,
  UserResponse,
} from '../interfaces/user-response.interface';
import { User, UserDocument } from '../schemas';
import { PasswordService } from './password.service';
import { TokenPair, TokenService } from './token.service';
import { VerificationService } from './verification.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationService: VerificationService,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponse> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email }).exec();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.userModel.create({
      name: dto.name.trim(),
      email,
      passwordHash,
      authProviders: [AuthProvider.Local],
      emailVerified: false,
      isNewUser: true,
      subscription: { active: false },
    });

    await this.verificationService.sendVerificationEmail(user);

    return toUserResponse(user);
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: UserResponse; tokens: TokenPair }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email }).exec();

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    const tokens = await this.tokenService.issueTokenPair(user);

    return {
      user: toUserResponse(user),
      tokens,
    };
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const userId =
      await this.verificationService.consumeEmailVerificationToken(rawToken);

    await this.userModel
      .findByIdAndUpdate(userId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
      .exec();
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .exec();

    if (!user || user.emailVerified) {
      return;
    }

    await this.verificationService.sendVerificationEmail(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .exec();

    if (!user?.passwordHash) {
      return;
    }

    await this.verificationService.sendPasswordResetEmail(user);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.verificationService.consumePasswordResetToken(
      dto.token,
    );

    const passwordHash = await this.passwordService.hash(dto.password);

    await this.userModel.findByIdAndUpdate(userId, { passwordHash }).exec();

    await this.tokenService.revokeAllUserSessions(userId.toString());
  }

  async findOrCreateGoogleUser(
    profile: GoogleProfileData,
  ): Promise<UserDocument> {
    const email = profile.email.toLowerCase().trim();

    const byGoogleId = await this.userModel
      .findOne({ googleId: profile.googleId })
      .exec();

    if (byGoogleId) {
      return byGoogleId;
    }

    const byEmail = await this.userModel.findOne({ email }).exec();

    if (byEmail) {
      return this.linkGoogleAccount(byEmail, profile);
    }

    return this.userModel.create({
      name: profile.name.trim(),
      email,
      googleId: profile.googleId,
      authProviders: [AuthProvider.Google],
      emailVerified: profile.emailVerified,
      emailVerifiedAt: profile.emailVerified ? new Date() : undefined,
      isNewUser: true,
      subscription: { active: false },
    });
  }

  async issueSessionForUser(
    user: UserDocument,
  ): Promise<{ user: UserResponse; tokens: TokenPair }> {
    const tokens = await this.tokenService.issueTokenPair(user);
    return { user: toUserResponse(user), tokens };
  }

  private async linkGoogleAccount(
    user: UserDocument,
    profile: GoogleProfileData,
  ): Promise<UserDocument> {
    user.googleId = profile.googleId;

    if (!user.authProviders.includes(AuthProvider.Google)) {
      user.authProviders.push(AuthProvider.Google);
    }

    if (profile.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
    }

    await user.save();
    return user;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const userId =
      await this.tokenService.validateAndRevokeRefresh(refreshToken);
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.tokenService.issueTokenPair(user);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return toUserResponse(user);
  }

  async findUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }
}
