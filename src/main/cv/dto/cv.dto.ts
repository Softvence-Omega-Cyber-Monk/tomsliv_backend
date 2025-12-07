import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType, WorkPermitType } from '@prisma';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ExperienceDto {
  @ApiProperty({ description: 'Job title for this experience' })
  @IsString()
  jobTitle: string;

  @ApiProperty({ enum: JobType, description: 'Type of job' })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Company name' })
  @IsString()
  company: string;

  @ApiProperty({ description: 'Summary of responsibilities and achievements' })
  @IsString()
  summary: string;

  @ApiProperty({ description: 'Start date (ISO 8601 format)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Whether this is an ongoing position' })
  @IsOptional()
  @IsBoolean()
  isOngoing?: boolean;
}

export class EducationDto {
  @ApiProperty({ description: 'Degree or qualification' })
  @IsString()
  degree: string;

  @ApiProperty({ description: 'Institution name' })
  @IsString()
  institution: string;

  @ApiProperty({ description: 'Start date (ISO 8601 format)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Whether this is ongoing education' })
  @IsOptional()
  @IsBoolean()
  isOngoing?: boolean;
}

export class CreateCvDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Location/Address' })
  @IsString()
  location: string;

  @ApiProperty({ description: 'Professional summary' })
  @IsString()
  summary: string;

  @ApiProperty({ description: 'Current/Desired job title' })
  @IsString()
  jobTitle: string;

  @ApiProperty({ enum: JobType, description: 'Preferred job type' })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiPropertyOptional({ description: 'Availability date (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  availability?: string;

  @ApiPropertyOptional({ description: 'Has driving license' })
  @IsOptional()
  @IsBoolean()
  hasDrivingLicense?: boolean;

  @ApiPropertyOptional({ description: 'Eligible to work in New Zealand' })
  @IsOptional()
  @IsBoolean()
  eligibleToWorkInNZ?: boolean;

  @ApiPropertyOptional({
    enum: WorkPermitType,
    description: 'Work permit type',
  })
  @IsOptional()
  @IsEnum(WorkPermitType)
  workPermitType?: WorkPermitType;

  @ApiPropertyOptional({
    type: [ExperienceDto],
    description: 'Work experiences',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  @ApiPropertyOptional({
    type: [EducationDto],
    description: 'Education history',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  educations?: EducationDto[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional custom CV file (PDF/DOC)',
  })
  @IsOptional()
  file?: Express.Multer.File;
}
