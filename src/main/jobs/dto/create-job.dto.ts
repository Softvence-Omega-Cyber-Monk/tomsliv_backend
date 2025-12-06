import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@prisma';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
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

  @ApiProperty({
    description: 'Job benefits',
    example: 'Health insurance, Paid leave',
  })
  @IsString()
  benefits: string;

  @ApiProperty({ description: 'Job location', example: 'California, USA' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    enum: JobType,
    description: 'Type of job',
    example: JobType.FULL_TIME,
  })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Number of open positions', example: 3 })
  @Type(() => Number)
  @IsNumber()
  numberOfPositions: number;

  @ApiProperty({
    description: 'Required experience in years',
    example: 2,
  })
  @Type(() => Number)
  @IsNumber()
  requiredExperience: number;

  @ApiProperty({
    description: 'Application deadline',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsISO8601()
  applicationDeadline: string;

  @ApiProperty({ description: 'Starting salary', example: 30000 })
  @Type(() => Number)
  @IsNumber()
  salaryStart: number;

  @ApiProperty({ description: 'Ending salary', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  salaryEnd: number;

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
