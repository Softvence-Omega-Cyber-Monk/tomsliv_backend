import { Module } from '@nestjs/common';
import { CvController } from './cv.controller';
import { CvComparisonService } from './services/cv-compare.service';
import { CvService } from './services/cv.service';

@Module({
  controllers: [CvController],
  providers: [CvService, CvComparisonService],
  exports: [CvService],
})
export class CvModule {}
