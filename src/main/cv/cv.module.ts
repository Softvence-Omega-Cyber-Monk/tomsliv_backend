import { Module } from '@nestjs/common';
import { CvController } from './controllers/cv.controller';
import { CvService } from './services/cv.service';

@Module({
  controllers: [CvController],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
