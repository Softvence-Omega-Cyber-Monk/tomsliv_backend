import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class FarmOwnerNotificationSettingsDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'Email notifications',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Weekly digest emails',
  })
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;

  @ApiPropertyOptional({
    example: 'true',
    description: 'New applicant alert emails',
  })
  @IsOptional()
  @IsBoolean()
  newApplicantAlert?: boolean;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Updates and tips emails',
  })
  @IsOptional()
  @IsBoolean()
  updatesAndTips?: boolean;
}

export class UserNotificationSettingsDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'Email notifications',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Weekly digest emails',
  })
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;

  @ApiPropertyOptional({
    example: 'true',
    description: 'New related jobs alert emails',
  })
  @IsOptional()
  @IsBoolean()
  newRelatedJobsAlert?: boolean;
}
