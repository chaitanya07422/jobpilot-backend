import { ExtractionStatus } from '../enums/extraction-status.enum';
import { ResumeProfileDocument } from '../schemas/resume-profile.schema';

export interface ResumeQuotaResponse {
  resumeUploadCount: number;
  resumeUploadLimit: number | null;
  uploadsRemaining: number | null;
  canUpload: boolean;
  canRetryAfterFailure?: boolean;
}

export function buildResumeQuotaResponse(
  uploadCount: number,
  uploadLimit: number | null,
  options?: { canUpload?: boolean; canRetryAfterFailure?: boolean },
): ResumeQuotaResponse {
  const uploadsRemaining =
    uploadLimit === null ? null : Math.max(0, uploadLimit - uploadCount);

  return {
    resumeUploadCount: uploadCount,
    resumeUploadLimit: uploadLimit,
    uploadsRemaining,
    canUpload:
      options?.canUpload ??
      (uploadLimit === null || (uploadsRemaining ?? 0) > 0),
    canRetryAfterFailure: options?.canRetryAfterFailure ?? false,
  };
}

export function buildProfileEditQuota(
  editCount: number,
  editLimit: number,
): {
  profileEditCount: number;
  profileEditLimit: number;
  editsRemaining: number;
} {
  return {
    profileEditCount: editCount,
    profileEditLimit: editLimit,
    editsRemaining: Math.max(0, editLimit - editCount),
  };
}

export function buildProfilePermissions(profile: ResumeProfileDocument): {
  profileEditCount: number;
  profileEditLimit: number;
  editsRemaining: number;
  canEditProfile: boolean;
  canSaveProfile: boolean;
  canConfirmProfile: boolean;
  isReadOnly: boolean;
} {
  const editLimit = profile.profileEditLimit ?? 2;
  const editCount = profile.profileEditCount ?? 0;
  const editQuota = buildProfileEditQuota(editCount, editLimit);
  const hasEditsRemaining = editCount < editLimit;
  const status = profile.extractionStatus;
  const needsQdrantRetry =
    status === ExtractionStatus.Confirmed && !!profile.qdrantSyncError;

  const canEditProfile =
    status === ExtractionStatus.ReadyForReview ||
    (status === ExtractionStatus.Confirmed && hasEditsRemaining);

  const canSaveProfile =
    (status === ExtractionStatus.ReadyForReview ||
      status === ExtractionStatus.Confirmed) &&
    hasEditsRemaining;

  const canConfirmProfile =
    status === ExtractionStatus.ReadyForReview || needsQdrantRetry;

  const isReadOnly =
    status === ExtractionStatus.Failed ||
    status === ExtractionStatus.Processing ||
    status === ExtractionStatus.Pending ||
    (status === ExtractionStatus.Confirmed && !hasEditsRemaining);

  return {
    ...editQuota,
    canEditProfile,
    canSaveProfile,
    canConfirmProfile,
    isReadOnly,
  };
}
