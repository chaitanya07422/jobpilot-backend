import { Injectable } from '@nestjs/common';
import { ResumeProfileDocument } from '../resumes/schemas/resume-profile.schema';

const MAX_EMBEDDING_TEXT_LENGTH = 12_000;

@Injectable()
export class ProfileEmbeddingTextService {
  build(profile: ResumeProfileDocument): string {
    const lines: string[] = [];

    if (profile.summary?.trim()) {
      lines.push(`Summary: ${profile.summary.trim()}`);
    }

    if (profile.totalYearsExperience != null) {
      lines.push(`Years of experience: ${profile.totalYearsExperience}`);
    }

    const skills = [
      ...new Set([...(profile.skills ?? []), ...(profile.technologies ?? [])]),
    ];
    if (skills.length) {
      lines.push(`Skills: ${skills.join(', ')}`);
    }

    for (const exp of profile.experience ?? []) {
      const dates = [exp.startDate, exp.endDate || 'Present']
        .filter(Boolean)
        .join(' – ');
      const tech = exp.technologies?.length
        ? ` [${exp.technologies.join(', ')}]`
        : '';
      lines.push(`Experience: ${exp.role} at ${exp.company} (${dates})${tech}`);
      for (const highlight of exp.highlights ?? []) {
        if (highlight.trim()) {
          lines.push(`  - ${highlight.trim()}`);
        }
      }
    }

    for (const proj of profile.projects ?? []) {
      const tech = proj.technologies?.length
        ? ` (${proj.technologies.join(', ')})`
        : '';
      lines.push(`Project: ${proj.name}${tech}`);
      if (proj.description?.trim()) {
        lines.push(`  ${proj.description.trim()}`);
      }
    }

    for (const edu of profile.education ?? []) {
      const parts = [edu.degree, edu.field, edu.institution].filter(Boolean);
      if (parts.length) {
        lines.push(`Education: ${parts.join(', ')}`);
      }
    }

    if (profile.certifications?.length) {
      lines.push(`Certifications: ${profile.certifications.join(', ')}`);
    }

    if (profile.languages?.length) {
      lines.push(`Languages: ${profile.languages.join(', ')}`);
    }

    for (const section of profile.otherSections ?? []) {
      if (section.title && section.items?.length) {
        lines.push(`${section.title}: ${section.items.join('; ')}`);
      }
    }

    return lines.join('\n').trim().slice(0, MAX_EMBEDDING_TEXT_LENGTH);
  }
}
