import { Injectable } from '@nestjs/common';
import { JobDocument } from '../schemas/job.schema';

const MAX_EMBEDDING_TEXT_LENGTH = 12_000;

@Injectable()
export class JobEmbeddingTextService {
  build(job: JobDocument): string {
    const lines: string[] = [];

    lines.push(`Role: ${job.role.trim()} at ${job.company.trim()}`);

    const locationParts = [job.location?.trim()].filter(Boolean);
    if (job.isRemote) {
      locationParts.push('Remote');
    }
    if (locationParts.length) {
      lines.push(`Location: ${locationParts.join(', ')}`);
    }

    if (job.seniority?.trim()) {
      lines.push(`Seniority: ${job.seniority.trim()}`);
    }

    if (job.salary?.trim()) {
      lines.push(`Salary: ${job.salary.trim()}`);
    }

    if (job.requiredSkills?.length) {
      lines.push(`Required skills: ${job.requiredSkills.join(', ')}`);
    }

    if (job.description?.trim()) {
      lines.push(`Description: ${job.description.trim()}`);
    }

    return lines.join('\n').trim().slice(0, MAX_EMBEDDING_TEXT_LENGTH);
  }
}
