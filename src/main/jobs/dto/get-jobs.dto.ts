import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@prisma';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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
