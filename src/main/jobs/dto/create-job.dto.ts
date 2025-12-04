import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@prisma';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ description: 'Job title or role', example: 'Farm Manager' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Job description',
    example: 'Manage daily farm operations',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Job benefits',
    example: 'Health insurance, Paid leave',
  })
  @IsString()
  @IsOptional()
  benefits?: string;

  @ApiProperty({ description: 'Job location', example: 'California, USA' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({
    enum: JobType,
    description: 'Type of job',
    example: JobType.FULL_TIME,
  })
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @ApiPropertyOptional({ description: 'Number of open positions', example: 3 })
  @IsNumber()
  @IsOptional()
  numberOfPositions?: number;

  @ApiPropertyOptional({
    description: 'Required experience in years',
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  requiredExperience?: number;

  @ApiPropertyOptional({
    description: 'Application deadline',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  applicationDeadline?: string;

  @ApiPropertyOptional({ description: 'Starting salary', example: 30000 })
  @IsNumber()
  @IsOptional()
  salaryStart?: number;

  @ApiPropertyOptional({ description: 'Ending salary', example: 50000 })
  @IsNumber()
  @IsOptional()
  salaryEnd?: number;

  @ApiPropertyOptional({
    description: 'Required skills',
    example: ['Tractor operation', 'Crop management'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'Required certifications',
    example: ['Pesticide License'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Machinery experience required',
    example: ['Combine Harvester', 'Irrigation systems'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  machineryExperience?: string[];
}
