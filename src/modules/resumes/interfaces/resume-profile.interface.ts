export interface ExtractedExperienceEntry {
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
  technologies: string[];
}

export interface ExtractedEducationEntry {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
}

export interface ExtractedProjectEntry {
  name: string;
  description?: string;
  technologies: string[];
  url?: string;
}

export interface ExtractedOtherSectionEntry {
  title: string;
  items: string[];
}

export interface ExtractedResumeProfile {
  summary?: string;
  totalYearsExperience?: number;
  skills?: string[];
  technologies?: string[];
  experience?: ExtractedExperienceEntry[];
  education?: ExtractedEducationEntry[];
  projects?: ExtractedProjectEntry[];
  certifications?: string[];
  languages?: string[];
  otherSections?: ExtractedOtherSectionEntry[];
}

export interface ResumeProfileResponse {
  resumeId: string;
  extractionStatus: string;
  extractionError?: string;
  summary?: string;
  totalYearsExperience?: number;
  skills: string[];
  technologies: string[];
  experience: ExtractedExperienceEntry[];
  education: ExtractedEducationEntry[];
  projects: ExtractedProjectEntry[];
  certifications: string[];
  languages: string[];
  otherSections: ExtractedOtherSectionEntry[];
  profileConfirmedAt?: string;
  profileEditCount: number;
  profileEditLimit: number;
  editsRemaining: number;
  canEditProfile: boolean;
  canSaveProfile: boolean;
  canConfirmProfile: boolean;
  isReadOnly: boolean;
  qdrantSyncedAt?: string;
  qdrantSyncError?: string;
  qdrantPointId?: string;
  embeddingModel?: string;
}
