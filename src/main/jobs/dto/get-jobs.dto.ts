import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus, JobType } from '@prisma';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// ---------------- Sort Enums ----------------
export enum JobSortByEnum {
  SALARY_START = 'salaryStart',
  SALARY_END = 'salaryEnd',
  APPLICATION_DEADLINE = 'applicationDeadline',
  CREATED_AT = 'createdAt',
  TITLE = 'title',
  LOCATION = 'location',
}

export enum SortOrderEnum {
  ASC = 'asc',
  DESC = 'desc',
}

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

// ---------------- All Jobs DTO ----------------
export class GetAllJobsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by job types',
    enum: JobType,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(JobType)
  jobTypes?: JobType | '';

  @ApiPropertyOptional({
    description: 'Filter by job roles (titles)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Filter by job locations',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({
    description: 'Filter by salary range: [min, max]',
    type: [Number],
    example: [10000, 50000],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  salaryRange?: [number, number];

  @ApiPropertyOptional({
    description: 'Search text (job title or description)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: JobSortByEnum,
  })
  @IsOptional()
  @IsEnum(JobSortByEnum)
  sortBy?: JobSortByEnum;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrderEnum,
  })
  @IsOptional()
  @IsEnum(SortOrderEnum)
  sortOrder?: SortOrderEnum;
}
