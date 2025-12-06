import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus, JobType } from '@prisma';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// ---------------- Farm Owner Jobs DTO ----------------
export class GetFarmOwnerJobsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: JobStatus, example: JobStatus.ACTIVE })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(JobStatus)
  status?: JobStatus | '';

  @ApiPropertyOptional({ example: 'Farm Manager' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  search?: string;
}

// ---------------- Sort Enums ----------------
export enum JobSortOptionEnum {
  MOST_RECENT = 'mostRecent',
  SALARY_HIGH_TO_LOW = 'salaryHighToLow',
  SALARY_LOW_TO_HIGH = 'salaryLowToHigh',
  DEADLINE_SOON = 'deadlineSoon',
}

// ---------------- Salary Range DTO ----------------
export class SalaryRangeDto {
  @ApiPropertyOptional({ description: 'Minimum salary', example: 10000 })
  @Type(() => Number)
  @IsNumber()
  min: number;

  @ApiPropertyOptional({ description: 'Maximum salary', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  max: number;
}

// ---------------- All Jobs DTO ----------------
export class GetAllJobsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by job status',
    enum: JobStatus,
    example: JobStatus.ACTIVE,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Filter by job types',
    type: [String],
    example: [JobType.FULL_TIME, JobType.PART_TIME],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value : [value]) : undefined,
  )
  @IsArray()
  @IsEnum(JobType, { each: true })
  jobTypes?: JobType[];

  @ApiPropertyOptional({
    description: 'Filter by job roles (titles)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value : [value]) : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Filter by job locations',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value : [value]) : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({
    description: 'Filter by salary range: [{min: number, max: number}]',
    type: [SalaryRangeDto],
    example: [{ min: 10000, max: 50000 }],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value : [value]) : undefined,
  )
  @Type(() => SalaryRangeDto)
  @IsArray()
  salaryRange?: SalaryRangeDto[];

  @ApiPropertyOptional({
    description: 'Search text (job title or description)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Predefined sorting option',
    enum: JobSortOptionEnum,
  })
  @IsOptional()
  @IsEnum(JobSortOptionEnum)
  sortOption?: JobSortOptionEnum;
}
