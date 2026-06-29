/** Metadata stored alongside each resume embedding vector in Qdrant. */
export interface ResumeVectorPayload {
  userId: string;
  resumeId: string;
  resumeProfileId: string;
  confirmedAt: string;
  embeddingModel: string;
  textHash: string;
  qdrantPointId: string;
  summary?: string;
  totalYearsExperience?: number;
  skills: string[];
  technologies: string[];
  companies: string[];
  roles: string[];
  certifications: string[];
  languages: string[];
}

export const RESUME_PAYLOAD_INDEXES: ReadonlyArray<{
  field_name: keyof ResumeVectorPayload;
  field_schema: 'keyword' | 'float' | 'datetime';
}> = [
  { field_name: 'userId', field_schema: 'keyword' },
  { field_name: 'resumeId', field_schema: 'keyword' },
  { field_name: 'resumeProfileId', field_schema: 'keyword' },
  { field_name: 'qdrantPointId', field_schema: 'keyword' },
  { field_name: 'embeddingModel', field_schema: 'keyword' },
  { field_name: 'confirmedAt', field_schema: 'datetime' },
  { field_name: 'totalYearsExperience', field_schema: 'float' },
  { field_name: 'skills', field_schema: 'keyword' },
  { field_name: 'technologies', field_schema: 'keyword' },
  { field_name: 'companies', field_schema: 'keyword' },
  { field_name: 'roles', field_schema: 'keyword' },
  { field_name: 'certifications', field_schema: 'keyword' },
  { field_name: 'languages', field_schema: 'keyword' },
];

/** Metadata stored alongside each job embedding vector in Qdrant. */
export interface JobVectorPayload {
  jobId: string;
  qdrantPointId: string;
  embeddingModel: string;
  textHash: string;
  company: string;
  role: string;
  location: string;
  isRemote: boolean;
  status: string;
  source: string;
  seniority?: string;
  skills: string[];
  description?: string;
  discoveredAt: string;
}

export const JOB_PAYLOAD_INDEXES: ReadonlyArray<{
  field_name: keyof JobVectorPayload;
  field_schema: 'keyword' | 'float' | 'bool' | 'datetime';
}> = [
  { field_name: 'jobId', field_schema: 'keyword' },
  { field_name: 'qdrantPointId', field_schema: 'keyword' },
  { field_name: 'embeddingModel', field_schema: 'keyword' },
  { field_name: 'company', field_schema: 'keyword' },
  { field_name: 'role', field_schema: 'keyword' },
  { field_name: 'location', field_schema: 'keyword' },
  { field_name: 'isRemote', field_schema: 'bool' },
  { field_name: 'status', field_schema: 'keyword' },
  { field_name: 'source', field_schema: 'keyword' },
  { field_name: 'seniority', field_schema: 'keyword' },
  { field_name: 'skills', field_schema: 'keyword' },
  { field_name: 'discoveredAt', field_schema: 'datetime' },
];
