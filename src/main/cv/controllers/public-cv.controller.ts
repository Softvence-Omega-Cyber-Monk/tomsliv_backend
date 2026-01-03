import { Controller } from '@nestjs/common';
import { PublicCvService } from '../services/public-cv.service';

@Controller('public-cv')
export class PublicCvController {
  constructor(private readonly publicCvService: PublicCvService) {}
}
