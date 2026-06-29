import { JobVectorPayload } from '../../common/qdrant/qdrant.types';
import { toQdrantPointId } from '../../embeddings/utils/qdrant-point-id.util';
import { JobDocument } from '../schemas/job.schema';

const MAX_DESCRIPTION_PAYLOAD_LENGTH = 500;

export function buildJobVectorPayload(
  job: JobDocument,
  embeddingModel: string,
  textHash: string,
): JobVectorPayload {
  const jobId = job._id.toString();
  const qdrantPointId = job.qdrantPointId ?? toQdrantPointId(jobId);

  return {
    jobId,
    qdrantPointId,
    embeddingModel,
    textHash,
    company: job.company.trim(),
    role: job.role.trim(),
    location: job.location?.trim() ?? '',
    isRemote: job.isRemote,
    status: job.status,
    source: job.source,
    seniority: job.seniority?.trim(),
    skills: job.requiredSkills ?? [],
    description: job.description
      ?.trim()
      .slice(0, MAX_DESCRIPTION_PAYLOAD_LENGTH),
    discoveredAt: job.discoveredAt.toISOString(),
  };
}
