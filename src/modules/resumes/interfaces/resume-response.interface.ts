import { ResumeDocument } from '../schemas';

export interface ResumeResponse {
  id: string;
  name: string;
  fileName: string;
  url: string;
  skillsExtracted: string[];
  uploadDate: string;
  isPrimary: boolean;
  fileSize: string;
}

export function toResumeResponse(resume: ResumeDocument): ResumeResponse {
  return {
    id: resume._id.toString(),
    name: resume.name,
    fileName: resume.fileName,
    url: resume.url,
    skillsExtracted: resume.skillsExtracted,
    uploadDate: (resume.get('createdAt') as Date).toISOString(),
    isPrimary: resume.isPrimary,
    fileSize: formatFileSize(resume.sizeBytes),
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
