import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { JobSource } from '../enums/job-source.enum';
import { JobCatalogStatus } from '../enums/job-status.enum';
import { JobSeedResult } from '../interfaces/job-response.interface';
import { CreateJobDto } from '../dto/create-job.dto';
import { JobsService } from './jobs.service';

interface SeedJobRecord {
  company: string;
  role: string;
  location: string;
  isRemote?: boolean;
  description: string;
  applyUrl: string;
  sourceUrl?: string;
  requiredSkills?: string[];
  salary?: string;
  source?: string;
  externalId?: string;
}

@Injectable()
export class JobSeedService {
  private readonly logger = new Logger(JobSeedService.name);

  constructor(
    private readonly jobsService: JobsService,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  async seedFromFile(): Promise<JobSeedResult> {
    const filePath = join(process.cwd(), 'scripts', 'data', 'seed-jobs.json');
    const raw = readFileSync(filePath, 'utf8');
    const records = JSON.parse(raw) as SeedJobRecord[];

    return this.seedRecords(records);
  }

  async seedRecords(records: SeedJobRecord[]): Promise<JobSeedResult> {
    const result: JobSeedResult = { created: 0, updated: 0, skipped: 0 };

    for (const record of records) {
      const source = this.normalizeSource(record.source);
      const externalId =
        record.externalId?.trim() ||
        `seed-${source}-${record.company}-${record.role}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 120);

      const dto: CreateJobDto = {
        company: record.company,
        role: record.role,
        location: record.location,
        isRemote: record.isRemote ?? false,
        description: record.description,
        applyUrl: record.applyUrl,
        sourceUrl: record.sourceUrl ?? record.applyUrl,
        requiredSkills: record.requiredSkills ?? [],
        salary: record.salary,
        source,
        externalId,
        status: JobCatalogStatus.Active,
      };

      try {
        const existing = await this.jobModel
          .findOne({ source, externalId })
          .exec();

        await this.jobsService.create(dto);

        if (existing) {
          result.updated += 1;
        } else {
          result.created += 1;
        }
      } catch (error) {
        result.skipped += 1;
        this.logger.warn(
          `Skipped seed job ${record.company} / ${record.role}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return result;
  }

  private normalizeSource(value?: string): JobSource {
    const normalized = value?.trim().toLowerCase();

    switch (normalized) {
      case 'greenhouse':
        return JobSource.Greenhouse;
      case 'lever':
        return JobSource.Lever;
      case 'ashby':
        return JobSource.Ashby;
      case 'linkedin':
        return JobSource.Linkedin;
      case 'naukri':
        return JobSource.Naukri;
      case 'manual':
        return JobSource.Manual;
      default:
        return JobSource.Seed;
    }
  }
}
