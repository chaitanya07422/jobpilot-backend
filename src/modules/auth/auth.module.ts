import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { DEFAULT_JWT_ACCESS_EXPIRES_IN } from './constants/auth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthToken, AuthTokenSchema, User, UserSchema } from './schemas';
import {
  AuthService,
  EmailService,
  PasswordService,
  TokenService,
  VerificationService,
} from './services';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuthToken.name, schema: AuthTokenSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            DEFAULT_JWT_ACCESS_EXPIRES_IN) as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    PasswordService,
    TokenService,
    EmailService,
    VerificationService,
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    GoogleAuthGuard,
  ],
  exports: [PasswordService, AuthService, MongooseModule],
})
export class AuthModule {}
