import { JobDocument } from '../schemas/job.schema';

export interface AdminJobResponse {
  id: string;
  source: string;
  externalId: string;
  sourceUrl: string;
  company: string;
  role: string;
  location: string;
  isRemote: boolean;
  description: string;
  applyUrl: string;
  requiredSkills: string[];
  salary?: string;
  seniority?: string;
  status: string;
  postedAt?: string;
  discoveredAt: string;
  lastSeenAt: string;
  closedAt?: string;
  expiresAt?: string;
  closeReason?: string;
  qdrantSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminJobListResponse {
  items: AdminJobResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobSeedResult {
  created: number;
  updated: number;
  skipped: number;
}

export interface JobEmbedResult {
  synced: number;
  skipped: number;
  failed: number;
}

export function toAdminJobResponse(job: JobDocument): AdminJobResponse {
  return {
    id: job._id.toString(),
    source: job.source,
    externalId: job.externalId,
    sourceUrl: job.sourceUrl,
    company: job.company,
    role: job.role,
    location: job.location,
    isRemote: job.isRemote,
    description: job.description,
    applyUrl: job.applyUrl,
    requiredSkills: job.requiredSkills ?? [],
    salary: job.salary,
    seniority: job.seniority,
    status: job.status,
    postedAt: job.postedAt?.toISOString(),
    discoveredAt: job.discoveredAt.toISOString(),
    lastSeenAt: job.lastSeenAt.toISOString(),
    closedAt: job.closedAt?.toISOString(),
    expiresAt: job.expiresAt?.toISOString(),
    closeReason: job.closeReason,
    qdrantSyncedAt: job.qdrantSyncedAt?.toISOString(),
    createdAt: (job.get('createdAt') as Date).toISOString(),
    updatedAt: (job.get('updatedAt') as Date).toISOString(),
  };
}
