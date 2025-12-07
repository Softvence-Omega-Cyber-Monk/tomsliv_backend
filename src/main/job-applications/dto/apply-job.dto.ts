import { IsNotEmpty, IsString } from 'class-validator';
import { CreateCvDto } from '../../cv/dto/cv.dto';

export class ApplyAsGuestDto extends CreateCvDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
}

export class ApplyWithSavedCvDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
}
