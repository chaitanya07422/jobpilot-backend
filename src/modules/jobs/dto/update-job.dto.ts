import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { JobCatalogStatus } from '../enums/job-status.enum';
import { CreateJobDto } from './create-job.dto';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @IsOptional()
  @IsEnum(JobCatalogStatus)
  status?: JobCatalogStatus;
}
