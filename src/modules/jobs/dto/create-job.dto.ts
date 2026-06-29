import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JobSource } from '../enums/job-source.enum';
import { JobCatalogStatus } from '../enums/job-status.enum';

export class CreateJobDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  role: string;

  @IsString()
  @MaxLength(300)
  location: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsString()
  @MinLength(20)
  @MaxLength(50_000)
  description: string;

  @IsUrl({ require_tld: false })
  applyUrl: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  sourceUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  salary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  seniority?: string;

  @IsOptional()
  @IsEnum(JobSource)
  source?: JobSource;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalId?: string;

  @IsOptional()
  @IsEnum(JobCatalogStatus)
  status?: JobCatalogStatus;
}
