import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DesiredPersonalityTrait,
  NonNegotiableSkill,
  PreferredCertification,
} from '@prisma';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isMaxGreaterThanMin', async: false })
class IsMaxGreaterThanMin implements ValidatorConstraintInterface {
  validate(maxExperience: number, args: ValidationArguments) {
    const object = args.object as UpsertIdealCandidateDto;
    return maxExperience >= object.minimumExperienceYears;
  }

  defaultMessage() {
    return 'Maximum experience years must be greater than or equal to minimum experience years';
  }
}

export class UpsertIdealCandidateDto {
  @ApiProperty({
    description: 'Minimum years of experience required',
    example: 2,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  minimumExperienceYears: number;

  @ApiProperty({
    description: 'Maximum years of experience required',
    example: 5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @Validate(IsMaxGreaterThanMin)
  maximumExperienceYears: number;

  @ApiProperty({
    description: 'Core skills required for the job',
    example: ['Dairy farming', 'Animal care', 'Equipment maintenance'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  coreSkills: string[];

  @ApiPropertyOptional({
    description: 'Desired personality traits',
    enum: DesiredPersonalityTrait,
    isArray: true,
    example: [
      DesiredPersonalityTrait.TEAM_PLAYER,
      DesiredPersonalityTrait.RELIABLE,
    ],
  })
  @IsArray()
  @IsEnum(DesiredPersonalityTrait, { each: true })
  @IsOptional()
  desiredPersonalityTraits?: DesiredPersonalityTrait[];

  @ApiPropertyOptional({
    description: 'Preferred certifications',
    enum: PreferredCertification,
    isArray: true,
    example: [
      PreferredCertification.DAIRY_FARMING_CERTIFICATION,
      PreferredCertification.FIRST_AID_AND_CPR,
    ],
  })
  @IsArray()
  @IsEnum(PreferredCertification, { each: true })
  @IsOptional()
  preferredCertifications?: PreferredCertification[];

  @ApiPropertyOptional({
    description: 'Non-negotiable skills or requirements',
    enum: NonNegotiableSkill,
    isArray: true,
    example: [
      NonNegotiableSkill.ABLE_TO_PERFORM_PHYSICAL_WORK,
      NonNegotiableSkill.VALID_DRIVER_S_LICENSE,
    ],
  })
  @IsArray()
  @IsEnum(NonNegotiableSkill, { each: true })
  @IsOptional()
  nonNegotiableSkills?: NonNegotiableSkill[];
}
