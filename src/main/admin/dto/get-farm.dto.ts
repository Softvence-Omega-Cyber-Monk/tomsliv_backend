import { ApiPropertyOptional } from '@nestjs/swagger';
import { FarmStatus } from '@prisma';
import { IsOptional, IsString } from 'class-validator';

export class GetAllFarmDto {
  @ApiPropertyOptional({ example: 'Farm Manager' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: FarmStatus.ACTIVE, enum: FarmStatus })
  @IsOptional()
  @IsString()
  status?: string;
}
