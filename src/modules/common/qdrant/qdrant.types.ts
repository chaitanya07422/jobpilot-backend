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
