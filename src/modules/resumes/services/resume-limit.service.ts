import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../../auth/schemas';
import {
  buildResumeQuotaResponse,
  ResumeQuotaResponse,
} from '../interfaces/resume-quota.interface';

@Injectable()
export class ResumeLimitService {
  constructor(private readonly configService: ConfigService) {}

  getUploadLimit(user: UserDocument): number | null {
    const subscription = user.subscription;

    if (subscription?.active && subscription.planId === 'enterprise') {
      return null;
    }

    if (subscription?.active && subscription.planId === 'pro') {
      return Number(
        this.configService.get<string>('RESUME_UPLOAD_LIMIT_PRO') ?? 5,
      );
    }

    return Number(
      this.configService.get<string>('DEFAULT_RESUME_UPLOAD_LIMIT') ?? 2,
    );
  }

  canUpload(
    user: UserDocument,
    options?: { allowRetryAfterFailure?: boolean },
  ): boolean {
    if (options?.allowRetryAfterFailure) {
      return true;
    }

    const limit = this.getUploadLimit(user);
    if (limit === null) {
      return true;
    }

    return (user.resumeUploadCount ?? 0) < limit;
  }

  assertCanUpload(
    user: UserDocument,
    options?: { allowRetryAfterFailure?: boolean },
  ): void {
    if (this.canUpload(user, options)) {
      return;
    }

    const limit = this.getUploadLimit(user);
    throw new ForbiddenException(
      `Upload limit reached (${user.resumeUploadCount}/${limit}). Upgrade your plan for more resume uploads.`,
    );
  }

  getQuota(
    user: UserDocument,
    options?: { canRetryAfterFailure?: boolean },
  ): ResumeQuotaResponse {
    const canUpload = this.canUpload(user, {
      allowRetryAfterFailure: options?.canRetryAfterFailure,
    });

    return buildResumeQuotaResponse(
      user.resumeUploadCount ?? 0,
      this.getUploadLimit(user),
      { ...options, canUpload },
    );
  }

  getProfileEditLimit(): number {
    return Number(this.configService.get<string>('PROFILE_EDIT_LIMIT') ?? 2);
  }
}
