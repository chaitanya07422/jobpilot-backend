import { createHash, randomUUID } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateJobDto } from '../dto/create-job.dto';
import { ListJobsQueryDto } from '../dto/list-jobs-query.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { JobCloseReason } from '../enums/job-close-reason.enum';
import { JobSource } from '../enums/job-source.enum';
import { JobCatalogStatus } from '../enums/job-status.enum';
import {
  AdminJobListResponse,
  AdminJobResponse,
  toAdminJobResponse,
} from '../interfaces/job-response.interface';
import { Job, JobDocument } from '../schemas/job.schema';
import { JobVectorService } from './job-vector.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
    private readonly jobVectorService: JobVectorService,
  ) {}

  async create(dto: CreateJobDto): Promise<AdminJobResponse> {
    const now = new Date();
    const source = dto.source ?? JobSource.Manual;
    const externalId =
      dto.externalId?.trim() ||
      this.buildManualExternalId(dto.company, dto.role);
    const sourceUrl = dto.sourceUrl?.trim() || dto.applyUrl;

    const job = await this.jobModel
      .findOneAndUpdate(
        { source, externalId },
        {
          $set: {
            sourceUrl,
            company: dto.company.trim(),
            role: dto.role.trim(),
            location: dto.location.trim(),
            isRemote: dto.isRemote ?? false,
            description: dto.description.trim(),
            applyUrl: dto.applyUrl.trim(),
            requiredSkills: dto.requiredSkills ?? [],
            salary: dto.salary?.trim(),
            seniority: dto.seniority?.trim(),
            status: dto.status ?? JobCatalogStatus.Active,
            lastSeenAt: now,
            closedAt: undefined,
            closeReason: undefined,
          },
          $setOnInsert: {
            source,
            externalId,
            discoveredAt: now,
            postedAt: now,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec();

    await this.jobVectorService.syncActiveJob(job);

    return toAdminJobResponse(job);
  }

  async findAll(query: ListJobsQueryDto): Promise<AdminJobListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = query.status ? { status: query.status } : {};

    const [items, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map(toAdminJobResponse),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findById(id: string): Promise<AdminJobResponse> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return toAdminJobResponse(job);
  }

  async update(id: string, dto: UpdateJobDto): Promise<AdminJobResponse> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (dto.company !== undefined) job.company = dto.company.trim();
    if (dto.role !== undefined) job.role = dto.role.trim();
    if (dto.location !== undefined) job.location = dto.location.trim();
    if (dto.isRemote !== undefined) job.isRemote = dto.isRemote;
    if (dto.description !== undefined) job.description = dto.description.trim();
    if (dto.applyUrl !== undefined) job.applyUrl = dto.applyUrl.trim();
    if (dto.sourceUrl !== undefined) job.sourceUrl = dto.sourceUrl.trim();
    if (dto.requiredSkills !== undefined) {
      job.requiredSkills = dto.requiredSkills;
    }
    if (dto.salary !== undefined) job.salary = dto.salary.trim();
    if (dto.seniority !== undefined) job.seniority = dto.seniority.trim();
    if (dto.source !== undefined) job.source = dto.source;
    if (dto.externalId !== undefined) job.externalId = dto.externalId.trim();

    if (dto.status !== undefined) {
      job.status = dto.status;
      if (dto.status === JobCatalogStatus.Closed) {
        job.closedAt = new Date();
        job.closeReason = JobCloseReason.Manual;
      } else if (dto.status === JobCatalogStatus.Active) {
        job.closedAt = undefined;
        job.closeReason = undefined;
        job.lastSeenAt = new Date();
      }
    }

    job.lastSeenAt = new Date();
    await job.save();

    if (job.status === JobCatalogStatus.Active) {
      await this.jobVectorService.syncActiveJob(job);
    } else {
      await this.jobVectorService.removeJob(job);
    }

    return toAdminJobResponse(job);
  }

  async close(id: string): Promise<AdminJobResponse> {
    return this.update(id, { status: JobCatalogStatus.Closed });
  }

  async remove(id: string): Promise<void> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobVectorService.removeJob(job);
    await this.jobModel.deleteOne({ _id: id }).exec();
  }

  private buildManualExternalId(company: string, role: string): string {
    const slug = `${company}-${role}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const suffix = createHash('sha256')
      .update(`${company}:${role}:${randomUUID()}`)
      .digest('hex')
      .slice(0, 8);

    return `manual-${slug || 'job'}-${suffix}`;
  }
}
