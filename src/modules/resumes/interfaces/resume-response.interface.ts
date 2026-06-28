import { ResumeDocument } from '../schemas';
import { ResumeProfileDocument } from '../schemas/resume-profile.schema';
import { toQdrantPointId } from '../../embeddings/utils/qdrant-point-id.util';
import { ResumeProfileResponse } from './resume-profile.interface';
import { buildProfilePermissions } from './resume-quota.interface';

export interface ResumeResponse {
  id: string;
  name: string;
  fileName: string;
  url: string;
  skillsExtracted: string[];
  uploadDate: string;
  isPrimary: boolean;
  fileSize: string;
  extractionStatus?: string;
  extractionError?: string;
  profile?: ResumeProfileResponse;
}

export function toResumeProfileResponse(
  profile: ResumeProfileDocument,
): ResumeProfileResponse {
  const permissions = buildProfilePermissions(profile);

  return {
    resumeId: profile.resumeId.toString(),
    extractionStatus: profile.extractionStatus,
    extractionError: profile.extractionError,
    summary: profile.summary,
    totalYearsExperience: profile.totalYearsExperience,
    skills: profile.skills ?? [],
    technologies: profile.technologies ?? [],
    experience: profile.experience ?? [],
    education: profile.education ?? [],
    projects: profile.projects ?? [],
    certifications: profile.certifications ?? [],
    languages: profile.languages ?? [],
    otherSections: profile.otherSections ?? [],
    profileConfirmedAt: profile.profileConfirmedAt?.toISOString(),
    ...permissions,
    qdrantSyncedAt: profile.qdrantSyncedAt?.toISOString(),
    qdrantSyncError: profile.qdrantSyncError,
    qdrantPointId:
      profile.qdrantPointId ?? toQdrantPointId(profile.userId.toString()),
    embeddingModel: profile.embeddingModel,
  };
}

export function toResumeResponse(
  resume: ResumeDocument,
  fileUrl: string,
  profile?: ResumeProfileDocument | null,
): ResumeResponse {
  return {
    id: resume._id.toString(),
    name: resume.name,
    fileName: resume.fileName,
    url: fileUrl,
    skillsExtracted: resume.skillsExtracted,
    uploadDate: (resume.get('createdAt') as Date).toISOString(),
    isPrimary: resume.isPrimary,
    fileSize: formatFileSize(resume.sizeBytes),
    extractionStatus: profile?.extractionStatus,
    extractionError: profile?.extractionError,
    profile: profile ? toResumeProfileResponse(profile) : undefined,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
