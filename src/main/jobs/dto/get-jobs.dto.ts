import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus, JobType } from '@prisma';
import { Transform, Type } from 'class-transformer';
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

export class SalaryRangeDto {
  @ApiProperty({ description: 'Minimum salary', example: 10000 })
  @Type(() => Number)
  @IsNumber()
  min: number;

  @ApiProperty({ description: 'Maximum salary', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  max: number;
}

// ---------------- All Jobs DTO ----------------
export class GetAllJobsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by job types',
    type: [String],
    example: [JobType.FULL_TIME, JobType.PART_TIME],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value ? value : []) ? value : [value];
  })
  @IsEnum(JobType, { each: true })
  jobTypes?: JobType[];

  @ApiPropertyOptional({
    description: 'Filter by job roles (titles)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value ? value : []) ? value : [value];
  })
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Filter by job locations',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value ? value : []) ? value : [value];
  })
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({
    description: 'Filter by salary range: [{min: number, max: number}]',
    type: [SalaryRangeDto],
    example: [{ min: 10000, max: 50000 }],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
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
