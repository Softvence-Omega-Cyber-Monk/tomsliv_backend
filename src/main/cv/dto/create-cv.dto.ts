import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CoreCvDto, EducationDto, ExperienceDto } from './cv.dto';

export class CreateCvBodyDto {
  @ApiPropertyOptional({
    description: 'ID of the uploaded file',
    example: 'file_123abc',
  })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiPropertyOptional({ type: CoreCvDto })
  @Type(() => CoreCvDto)
  @IsOptional()
  coreInfo: CoreCvDto;

  @ApiPropertyOptional({ type: [ExperienceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  })
  experiences: ExperienceDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  })
  educations: EducationDto[];
}
