import { JobType, WorkPermitType } from '@prisma'; // Assuming these are exported from generated prisma client
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
  @IsString()
  jobTitle: string;

  @IsEnum(JobType)
  jobType: JobType;

  @IsString()
  company: string;

  @IsString()
  summary: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isOngoing?: boolean;
}

export class EducationDto {
  @IsString()
  degree: string;

  @IsString()
  institution: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isOngoing?: boolean;
}

export class CreateCvDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  location: string;

  @IsString()
  summary: string;

  @IsString()
  jobTitle: string;

  @IsEnum(JobType)
  jobType: JobType;

  @IsOptional()
  @IsDateString()
  availability?: string;

  @IsOptional()
  @IsBoolean()
  hasDrivingLicense?: boolean;

  @IsOptional()
  @IsBoolean()
  eligibleToWorkInNZ?: boolean;

  @IsOptional()
  @IsEnum(WorkPermitType)
  workPermitType?: WorkPermitType;

  @IsOptional()
  @IsString()
  customCVId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  educations?: EducationDto[];
}
