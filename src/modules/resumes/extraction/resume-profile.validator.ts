import { ExtractedResumeProfile } from '../interfaces/resume-profile.interface';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => asString(item)).filter(Boolean))];
}

function asNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

type LooseExtractedProfile = {
  summary?: unknown;
  totalYearsExperience?: unknown;
  skills?: unknown;
  technologies?: unknown;
  experience?: unknown;
  education?: unknown;
  projects?: unknown;
  certifications?: unknown;
  languages?: unknown;
  otherSections?: unknown;
};

export function normalizeExtractedProfile(
  raw: LooseExtractedProfile,
): ExtractedResumeProfile {
  return {
    summary: asString(raw.summary ?? ''),
    totalYearsExperience: asNumberOrUndefined(raw.totalYearsExperience),
    skills: asStringArray(raw.skills),
    technologies: asStringArray(raw.technologies),
    experience: Array.isArray(raw.experience)
      ? raw.experience.map((entry) => {
          const row = asRecord(entry);
          return {
            company: asString(row.company),
            role: asString(row.role),
            location: asString(row.location) || undefined,
            startDate: asString(row.startDate) || undefined,
            endDate: asString(row.endDate) || undefined,
            highlights: asStringArray(row.highlights),
            technologies: asStringArray(row.technologies),
          };
        })
      : [],
    education: Array.isArray(raw.education)
      ? raw.education.map((entry) => {
          const row = asRecord(entry);
          return {
            institution: asString(row.institution),
            degree: asString(row.degree) || undefined,
            field: asString(row.field) || undefined,
            startDate: asString(row.startDate) || undefined,
            endDate: asString(row.endDate) || undefined,
            grade: asString(row.grade) || undefined,
          };
        })
      : [],
    projects: Array.isArray(raw.projects)
      ? raw.projects.map((entry) => {
          const row = asRecord(entry);
          return {
            name: asString(row.name),
            description: asString(row.description) || undefined,
            technologies: asStringArray(row.technologies),
            url: asString(row.url) || undefined,
          };
        })
      : [],
    certifications: asStringArray(raw.certifications),
    languages: asStringArray(raw.languages),
    otherSections: Array.isArray(raw.otherSections)
      ? raw.otherSections.map((entry) => {
          const row = asRecord(entry);
          return {
            title: asString(row.title),
            items: asStringArray(row.items),
          };
        })
      : [],
  };
}

export function dedupeSkills(profile: ExtractedResumeProfile): string[] {
  return [
    ...new Set([...(profile.skills ?? []), ...(profile.technologies ?? [])]),
  ];
}
