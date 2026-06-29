import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { successResponse } from '../../shared/helpers';
import { CreateJobDto } from '../dto/create-job.dto';
import { ListJobsQueryDto } from '../dto/list-jobs-query.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { AdminApiKeyGuard } from '../guards/admin-api-key.guard';
import { JobSeedService } from '../services/job-seed.service';
import { JobsService } from '../services/jobs.service';

@ApiTags('Admin Jobs')
@ApiHeader({
  name: 'X-Admin-Key',
  description: 'Admin API key (ADMIN_API_KEY)',
  required: true,
})
@UseGuards(AdminApiKeyGuard)
@Controller('admin/jobs')
export class AdminJobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobSeedService: JobSeedService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List jobs (admin)' })
  async list(@Query() query: ListJobsQueryDto) {
    const data = await this.jobsService.findAll(query);
    return successResponse(data, 'Jobs fetched');
  }

  @Post('seed')
  @ApiOperation({ summary: 'Load jobs from scripts/data/seed-jobs.json (admin)' })
  async seed() {
    const result = await this.jobSeedService.seedFromFile();
    return successResponse(result, 'Seed completed');
  }

  @Post()
  @ApiOperation({ summary: 'Create or upsert a job manually (admin)' })
  async create(@Body() dto: CreateJobDto) {
    const job = await this.jobsService.create(dto);
    return successResponse(job, 'Job saved');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by id (admin)' })
  async getOne(@Param('id') id: string) {
    const job = await this.jobsService.findById(id);
    return successResponse(job, 'Job fetched');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update job (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    const job = await this.jobsService.update(id, dto);
    return successResponse(job, 'Job updated');
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Mark job as closed (admin)' })
  async close(@Param('id') id: string) {
    const job = await this.jobsService.close(id);
    return successResponse(job, 'Job closed');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete job (admin)' })
  async remove(@Param('id') id: string) {
    await this.jobsService.remove(id);
    return successResponse(null, 'Job deleted');
  }
}
