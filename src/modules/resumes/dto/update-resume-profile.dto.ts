import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ExperienceEntryDto {
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) highlights?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) technologies?: string[];
}

class EducationEntryDto {
  @IsOptional() @IsString() institution?: string;
  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() grade?: string;
}

class ProjectEntryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) technologies?: string[];
  @IsOptional() @IsString() url?: string;
}

class OtherSectionEntryDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) items?: string[];
}

export class UpdateResumeProfileDto {
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsNumber() totalYearsExperience?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) technologies?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceEntryDto)
  experience?: ExperienceEntryDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationEntryDto)
  education?: EducationEntryDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectEntryDto)
  projects?: ProjectEntryDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) certifications?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtherSectionEntryDto)
  otherSections?: OtherSectionEntryDto[];
}
