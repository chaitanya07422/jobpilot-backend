import { toQdrantPointId } from '../../embeddings/utils/qdrant-point-id.util';
import { ResumeProfileDocument } from '../schemas/resume-profile.schema';
import { ResumeVectorPayload } from '../../common/qdrant/qdrant.types';

const MAX_SUMMARY_PAYLOAD_LENGTH = 500;

export function buildResumeVectorPayload(
  profile: ResumeProfileDocument,
  embeddingModel: string,
  textHash: string,
): ResumeVectorPayload {
  const experience = profile.experience ?? [];
  const confirmedAt =
    profile.profileConfirmedAt?.toISOString() ?? new Date().toISOString();
  const qdrantPointId =
    profile.qdrantPointId ?? toQdrantPointId(profile.userId.toString());

  return {
    userId: profile.userId.toString(),
    resumeId: profile.resumeId.toString(),
    resumeProfileId: profile._id.toString(),
    qdrantPointId,
    confirmedAt,
    embeddingModel,
    textHash,
    summary: profile.summary?.trim().slice(0, MAX_SUMMARY_PAYLOAD_LENGTH),
    totalYearsExperience: profile.totalYearsExperience,
    skills: profile.skills ?? [],
    technologies: profile.technologies ?? [],
    companies: experience.map((entry) => entry.company.trim()).filter(Boolean),
    roles: experience.map((entry) => entry.role.trim()).filter(Boolean),
    certifications: profile.certifications ?? [],
    languages: profile.languages ?? [],
  };
}
